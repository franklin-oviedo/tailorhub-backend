import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from '../entities/employee.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class EmployeeService {
  private static readonly SUPER_ADMIN_DELETE_ERROR = 'The super admin employee profile cannot be deleted.';

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private isSuperAdmin(role: Role): boolean {
    return role === Role.SUPER_ADMIN || role === Role.ADMIN;
  }

  private assertStoreAccess(actor: JwtPayload, storeId?: string): void {
    if (!this.isSuperAdmin(actor.role) && (!storeId || storeId !== actor.storeId)) {
      throw new ForbiddenException('You cannot access employees from another store.');
    }
  }

  async create(createEmployeeDto: CreateEmployeeDto, actor: JwtPayload): Promise<Employee> {
    const targetStoreId = this.isSuperAdmin(actor.role)
      ? (createEmployeeDto.storeId ?? actor.storeId)
      : actor.storeId;

    if (createEmployeeDto.email) {
      const existingByEmail = await this.employeeRepository.findOne({
        where: {
          email: createEmployeeDto.email,
          store: { id: targetStoreId },
        },
        relations: ['store'],
      });

      if (existingByEmail) {
        throw new BadRequestException('An employee with that email already exists in this store.');
      }
    }

    const employee = this.employeeRepository.create({
      name: createEmployeeDto.name,
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
      notes: createEmployeeDto.notes,
      active: createEmployeeDto.active ?? true,
      store: { id: targetStoreId },
      user: createEmployeeDto.userId ? ({ id: createEmployeeDto.userId } as Employee['user']) : undefined,
    });

    return this.employeeRepository.save(employee);
  }

  async findAll(actor: JwtPayload): Promise<Employee[]> {
    const qb = this.employeeRepository.createQueryBuilder('employee')
      .leftJoinAndSelect('employee.store', 'store')
      .leftJoinAndSelect('employee.user', 'user')
      .orderBy('employee.createdAt', 'DESC');

    if (!this.isSuperAdmin(actor.role)) {
      qb.andWhere('employee.storeId = :storeId', { storeId: actor.storeId });
    }

    return qb.getMany();
  }

  async findOne(id: string, actor: JwtPayload): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['store', 'user'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    this.assertStoreAccess(actor, employee.store?.id);
    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    actor: JwtPayload,
  ): Promise<Employee> {
    const employee = await this.findOne(id, actor);
    const currentStoreId = employee.store?.id ?? actor.storeId;

    if (!this.isSuperAdmin(actor.role) && updateEmployeeDto.storeId && updateEmployeeDto.storeId !== currentStoreId) {
      throw new ForbiddenException('Managers cannot move employees across stores.');
    }

    const targetStoreId = this.isSuperAdmin(actor.role)
      ? (updateEmployeeDto.storeId ?? currentStoreId)
      : currentStoreId;

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingByEmail = await this.employeeRepository.findOne({
        where: {
          email: updateEmployeeDto.email,
          store: { id: targetStoreId },
        },
        relations: ['store'],
      });

      if (existingByEmail && existingByEmail.id !== employee.id) {
        throw new BadRequestException('An employee with that email already exists in this store.');
      }
    }

    employee.name = updateEmployeeDto.name ?? employee.name;
    employee.email = updateEmployeeDto.email ?? employee.email;
    employee.phone = updateEmployeeDto.phone ?? employee.phone;
    employee.notes = updateEmployeeDto.notes ?? employee.notes;
    employee.active = updateEmployeeDto.active ?? employee.active;

    if (updateEmployeeDto.storeId) {
      employee.store = { id: updateEmployeeDto.storeId } as Employee['store'];
    }

    if (updateEmployeeDto.userId) {
      employee.user = { id: updateEmployeeDto.userId } as Employee['user'];
    }

    return this.employeeRepository.save(employee);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const employee = await this.findOne(id, actor);

    if (employee.user?.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(EmployeeService.SUPER_ADMIN_DELETE_ERROR);
    }

    await this.employeeRepository.remove(employee);
  }
}
