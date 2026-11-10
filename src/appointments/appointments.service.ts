import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { AppointmentStatusEnum } from '../enums/appointments.enum';
import { User } from '../entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { Customers } from '../entities/customer.entity';
import { GoogleCalendarService } from '../auth/google-calendar.service';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class AppointmentsService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}
  /* c8 ignore stop */

  private async resolveActorCustomerId(actor: JwtPayload): Promise<string> {
    const actorUser = await this.usersRepository.findOne({
      where: { id: actor.sub },
      relations: { customer: true },
    });

    const customerId = actorUser?.customer?.id;
    if (!customerId) {
      throw new ForbiddenException('Client account is not linked to a customer profile.');
    }

    return customerId;
  }

  private async resolveCalendarOwnerUserId(
    actor: JwtPayload,
    storeId: string,
  ): Promise<string | null> {
    const actorUser = await this.usersRepository.findOne({
      where: { id: actor.sub },
      select: {
        id: true,
        isActive: true,
        role: true,
        googleRefreshToken: true,
      },
    });

    if (actorUser && actorUser.isActive === false) {
      return null;
    }

    if (actorUser?.role === Role.MANAGER && actorUser.googleRefreshToken) {
      return actorUser.id;
    }

    const linkedManager = await this.usersRepository.findOne({
      where: {
        role: Role.MANAGER,
        isActive: true,
        store: { id: storeId },
        googleRefreshToken: Not(IsNull()),
      },
      select: {
        id: true,
      },
    });

    if (linkedManager?.id) {
      return linkedManager.id;
    }

    if (actorUser?.googleRefreshToken) {
      return actorUser.id;
    }

    return null;
  }

  async create(
    createAppointmentDto: CreateAppointmentDto,
    actor: JwtPayload,
  ): Promise<Appointment> {
    if (createAppointmentDto.scheduledAt <= new Date()) {
      throw new BadRequestException('The appointment time must be in the future.');
    }

    const customer = await this.customersRepository.findOne({
      where: { id: createAppointmentDto.customerId },
      relations: { store: true },
    });

    if (!customer) {
      throw new BadRequestException('Client not found.');
    }

    if (customer.store.id !== actor.storeId ) {
      throw new ForbiddenException('Users must belong to your store.');
    }

    if (actor.role === Role.CLIENT) {
      const actorCustomerId = await this.resolveActorCustomerId(actor);
      if (customer.id !== actorCustomerId) {
        throw new ForbiddenException('Clients can only create their own appointments.');
      }
    }

    const appointment = this.appointmentsRepository.create({
      scheduledAt: createAppointmentDto.scheduledAt,
      status: createAppointmentDto.status ?? AppointmentStatusEnum.SCHEDULED,
      notes: createAppointmentDto.notes ?? null,
      googleCalendarEventId: null,
      googleCalendarOwnerUserId: null,
      customer,
      store: customer.store,
    });

    const savedAppointment = await this.appointmentsRepository.save(appointment);
    const calendarOwnerUserId = await this.resolveCalendarOwnerUserId(actor, customer.store.id);

    if (!calendarOwnerUserId) {
      return savedAppointment;
    }

    const durationMinutes = Number(
      process.env.GOOGLE_CALENDAR_APPOINTMENT_DURATION_MINUTES ?? '60',
    );
    const endAt = new Date(
      createAppointmentDto.scheduledAt.getTime() +
      (Number.isNaN(durationMinutes) ? 60 : durationMinutes) * 60 * 1000,
    );

    try {
      const event = await this.googleCalendarService.createAppointmentEventForUser(calendarOwnerUserId, {
        summary: `Cita en Satreria ${customer.store.name} - ${customer.name}`,
        description: createAppointmentDto.notes ?? `Appointment for ${customer.name}`,
        startAt: createAppointmentDto.scheduledAt,
        endAt,
      });

      savedAppointment.googleCalendarEventId = event.eventId;
      savedAppointment.googleCalendarOwnerUserId = calendarOwnerUserId;
      return this.appointmentsRepository.save(savedAppointment);
    } catch (error) {
      await this.appointmentsRepository.remove(savedAppointment);
      throw error;
    }
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
      .leftJoinAndSelect('appointment.store', 'store');

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('store.id = :storeId', { storeId: actor.storeId });
    }

    if (actor.role === Role.CLIENT) {
      const actorCustomerId = await this.resolveActorCustomerId(actor);
      qb.andWhere('customer.id = :customerId', { customerId: actorCustomerId });
    }

    if (query.customerId && query.customerId !== 'undefined') {
      qb.andWhere('customer.id = :filteredCustomerId', {
        filteredCustomerId: query.customerId,
      });
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
      relations: { customer: true, store: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    if (!isSuperAdmin(actor.role) && appointment.store.id !== actor.storeId) {
      throw new ForbiddenException('You cannot access appointments from another store.');
    }

    if (actor.role === Role.CLIENT) {
      const actorCustomerId = await this.resolveActorCustomerId(actor);
      if (appointment.customer?.id !== actorCustomerId) {
        throw new ForbiddenException('Clients can only access their own appointments.');
      }
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
      const customer = await this.appointmentsRepository.findOne({
        where: { customer: { id: updateAppointmentDto.customerId } },
        relations: { customer: true, store: true },
      });
      if (!customer || customer.store.id !== actor.storeId) {
        throw new BadRequestException('Invalid customer for this store.');
      }
      appointment.customer = customer.customer;
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

  async cancel(id: string, actor: JwtPayload): Promise<Appointment> {
    const appointment = await this.findOne(id, actor);

    if (
      appointment.status !== AppointmentStatusEnum.SCHEDULED &&
      appointment.status !== AppointmentStatusEnum.CONFIRMED
    ) {
      throw new BadRequestException('Only scheduled or confirmed appointments can be cancelled.');
    }

    if (appointment.googleCalendarEventId && appointment.googleCalendarOwnerUserId) {
      await this.googleCalendarService.cancelAppointmentEventForUser(
        appointment.googleCalendarOwnerUserId,
        appointment.googleCalendarEventId,
      );
      appointment.googleCalendarEventId = null;
      appointment.googleCalendarOwnerUserId = null;
    }

    appointment.status = AppointmentStatusEnum.CANCELLED;
    return this.appointmentsRepository.save(appointment);
  }
}
