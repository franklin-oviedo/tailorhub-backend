import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { AppointmentStatusEnum } from '../enums/appointments.enum';
import { User } from '../entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { Customers } from 'src/entities/customer.entity';
import { Employee } from 'src/entities/employee.entity';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class AppointmentsService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}
  /* c8 ignore stop */

  async create(
    createAppointmentDto: CreateAppointmentDto,
    actor: JwtPayload,
  ): Promise<Appointment> {
    if (createAppointmentDto.scheduledAt <= new Date()) {
      throw new BadRequestException('The appointment time must be in the future.');
    }

    const customer = await this.customersRepository.findOne({
      where: { id: createAppointmentDto.customerId },
      relations: ['store'],
    });
    const employee = await this.employeesRepository.findOne({
      where: { id: createAppointmentDto.employeeId },
      relations: ['store'],
    });

    if (!customer || !employee) {
      throw new BadRequestException('Client or employee not found.');
    }

    if (customer.store.id !== actor.storeId || employee.store.id !== actor.storeId) {
      throw new ForbiddenException('Users must belong to your store.');
    }

    const appointment = this.appointmentsRepository.create({
      scheduledAt: createAppointmentDto.scheduledAt,
      status: createAppointmentDto.status ?? AppointmentStatusEnum.SCHEDULED,
      notes: createAppointmentDto.notes ?? null,
      customer,
      store: customer.store,
    });

    return this.appointmentsRepository.save(appointment);
  }

  async findAll(
    actor: JwtPayload,
    query: ListAppointmentsQueryDto,
  ): Promise<PaginatedResult<Appointment>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.employee', 'employee');

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('appointment.storeId = :storeId', { storeId: actor.storeId });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('appointment.scheduledAt >= :from', { from: query.from.toISOString() });
    }

    if (query.to) {
      qb.andWhere('appointment.scheduledAt <= :to', { to: query.to.toISOString() });
    }

    qb.orderBy('appointment.scheduledAt', 'ASC').skip(skip).take(limit);
    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(id: string, actor: JwtPayload): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['customer', 'employee', 'store'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    if (!isSuperAdmin(actor.role) && appointment.store.id !== actor.storeId) {
      throw new ForbiddenException('You cannot access appointments from another store.');
    }

    return appointment;
  }

  async update(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
    actor: JwtPayload,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id, actor);

    if (updateAppointmentDto.scheduledAt) {
      if (updateAppointmentDto.scheduledAt <= new Date()) {
        throw new BadRequestException('The appointment time must be in the future.');
      }
    }

    if (updateAppointmentDto.customerId) {
      const customer = await this.customersRepository.findOne({
        where: { id: updateAppointmentDto.customerId },
      });
      if (!customer || customer.store.id !== actor.storeId) {
        throw new BadRequestException('Invalid customer for this store.');
      }
      appointment.customer = customer;
    }

    Object.assign(appointment, {
      ...updateAppointmentDto,
    });
    
    return this.appointmentsRepository.save(appointment);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const appointment = await this.findOne(id, actor);
    await this.appointmentsRepository.remove(appointment);
  }
}
