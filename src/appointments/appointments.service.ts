import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { User } from '../entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class AppointmentsService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  /* c8 ignore stop */

  async create(
    createAppointmentDto: CreateAppointmentDto,
    actor: JwtPayload,
  ): Promise<Appointment> {
    if (createAppointmentDto.endsAt <= createAppointmentDto.startsAt) {
      throw new BadRequestException('The appointment end time must be after start time.');
    }

    const client = await this.usersRepository.findOne({
      where: { id: createAppointmentDto.clientId },
    });
    const employee = await this.usersRepository.findOne({
      where: { id: createAppointmentDto.employeeId },
    });

    if (!client || !employee) {
      throw new BadRequestException('Client or employee not found.');
    }

    if (client.storeId !== actor.storeId || employee.storeId !== actor.storeId) {
      throw new ForbiddenException('Users must belong to your store.');
    }

    const appointment = this.appointmentsRepository.create({
      ...createAppointmentDto,
      storeId: actor.storeId,
      client,
      employee,
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
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.employee', 'employee');

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('appointment.storeId = :storeId', { storeId: actor.storeId });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('appointment.startsAt >= :from', { from: query.from.toISOString() });
    }

    if (query.to) {
      qb.andWhere('appointment.startsAt <= :to', { to: query.to.toISOString() });
    }

    qb.orderBy('appointment.startsAt', 'ASC').skip(skip).take(limit);
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
      relations: ['client', 'employee'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    if (!isSuperAdmin(actor.role) && appointment.storeId !== actor.storeId) {
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

    if (updateAppointmentDto.startsAt && updateAppointmentDto.endsAt) {
      if (updateAppointmentDto.endsAt <= updateAppointmentDto.startsAt) {
        throw new BadRequestException('The appointment end time must be after start time.');
      }
    }

    if (updateAppointmentDto.clientId) {
      const client = await this.usersRepository.findOne({
        where: { id: updateAppointmentDto.clientId },
      });
      if (!client || client.storeId !== actor.storeId) {
        throw new BadRequestException('Invalid client for this store.');
      }
      appointment.client = client;
      appointment.clientId = client.id;
    }

    if (updateAppointmentDto.employeeId) {
      const employee = await this.usersRepository.findOne({
        where: { id: updateAppointmentDto.employeeId },
      });
      if (!employee || employee.storeId !== actor.storeId) {
        throw new BadRequestException('Invalid employee for this store.');
      }
      appointment.employee = employee;
      appointment.employeeId = employee.id;
    }

    Object.assign(appointment, {
      startsAt: updateAppointmentDto.startsAt ?? appointment.startsAt,
      endsAt: updateAppointmentDto.endsAt ?? appointment.endsAt,
      status: updateAppointmentDto.status ?? appointment.status,
      notes: updateAppointmentDto.notes ?? appointment.notes,
    });

    if (appointment.endsAt <= appointment.startsAt) {
      throw new BadRequestException('The appointment end time must be after start time.');
    }

    return this.appointmentsRepository.save(appointment);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const appointment = await this.findOne(id, actor);
    await this.appointmentsRepository.remove(appointment);
  }
}
