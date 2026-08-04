import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Appointment } from '../entities/appointment.entity';
import { User } from '../entities/user.entity';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentsRepository: jest.Mocked<Repository<Appointment>>;
  let usersRepository: jest.Mocked<Repository<User>>;

  const actor = {
    sub: 'u1',
    email: 'emp@test.com',
    role: Role.EMPLOYEE,
    storeId: 'store-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    appointmentsRepository = module.get(getRepositoryToken(Appointment));
    usersRepository = module.get(getRepositoryToken(User));
  });

  const createQb = () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'a1' }], 1]),
    };

    appointmentsRepository.createQueryBuilder.mockReturnValue(qb as any);
    return qb;
  };

  it('throws BadRequestException when end time is before start', async () => {
    await expect(
      service.create(
        {
          clientId: 'c1',
          employeeId: 'e1',
          startsAt: new Date('2026-08-01T10:00:00Z'),
          endsAt: new Date('2026-08-01T09:00:00Z'),
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException when users are from another store', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce({ id: 'c1', storeId: 'store-1' } as User)
      .mockResolvedValueOnce({ id: 'e1', storeId: 'other-store' } as User);

    await expect(
      service.create(
        {
          clientId: 'c1',
          employeeId: 'e1',
          startsAt: new Date('2026-08-01T10:00:00Z'),
          endsAt: new Date('2026-08-01T11:00:00Z'),
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when appointment is missing', async () => {
    appointmentsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates appointment successfully', async () => {
    const client = { id: 'c1', storeId: 'store-1' } as User;
    const employee = { id: 'e1', storeId: 'store-1' } as User;
    const created = { id: 'a1' } as Appointment;

    usersRepository.findOne.mockResolvedValueOnce(client).mockResolvedValueOnce(employee);
    appointmentsRepository.create.mockReturnValue(created);
    appointmentsRepository.save.mockResolvedValue(created);

    const result = await service.create(
      {
        clientId: 'c1',
        employeeId: 'e1',
        startsAt: new Date('2026-08-01T10:00:00Z'),
        endsAt: new Date('2026-08-01T11:00:00Z'),
      },
      actor,
    );

    expect(result).toEqual(created);
  });

  it('returns paginated appointments with filters', async () => {
    const qb = createQb();

    const result = await service.findAll(actor, {
      page: 1,
      limit: 10,
      status: undefined,
      from: new Date('2026-08-01T00:00:00Z'),
      to: new Date('2026-08-31T23:59:59Z'),
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta.totalItems).toBe(1);
  });

  it('returns paginated appointments for admin without store filter', async () => {
    const qb = createQb();
    const adminActor = { ...actor, role: Role.ADMIN };

    await service.findAll(adminActor, {} as any);

    expect(qb.orderBy).toHaveBeenCalled();
  });

  it('updates appointment fields successfully', async () => {
    const existing = {
      id: 'a1',
      storeId: 'store-1',
      startsAt: new Date('2026-08-01T10:00:00Z'),
      endsAt: new Date('2026-08-01T11:00:00Z'),
      status: 'scheduled',
    } as unknown as Appointment;

    appointmentsRepository.findOne.mockResolvedValue(existing);
    appointmentsRepository.save.mockResolvedValue(existing);

    const result = await service.update(
      'a1',
      {
        notes: 'updated',
      },
      actor,
    );

    expect(result).toBe(existing);
    expect(appointmentsRepository.save).toHaveBeenCalled();
  });

  it('removes appointment', async () => {
    const existing = { id: 'a1', storeId: 'store-1' } as Appointment;
    appointmentsRepository.findOne.mockResolvedValue(existing);
    appointmentsRepository.remove.mockResolvedValue(existing);

    await service.remove('a1', actor);

    expect(appointmentsRepository.remove).toHaveBeenCalledWith(existing);
  });

  it('throws BadRequestException when client or employee does not exist', async () => {
    usersRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'e1' } as User);

    await expect(
      service.create(
        {
          clientId: 'c1',
          employeeId: 'e1',
          startsAt: new Date('2026-08-01T10:00:00Z'),
          endsAt: new Date('2026-08-01T11:00:00Z'),
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException on cross-store findOne for non-admin', async () => {
    const employeeActor = { ...actor, role: Role.EMPLOYEE };
    appointmentsRepository.findOne.mockResolvedValue({ id: 'a1', storeId: 'other-store' } as Appointment);

    await expect(service.findOne('a1', employeeActor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequestException when updating invalid date range in same payload', async () => {
    const existing = {
      id: 'a1',
      storeId: 'store-1',
      startsAt: new Date('2026-08-01T10:00:00Z'),
      endsAt: new Date('2026-08-01T11:00:00Z'),
      status: 'scheduled',
    } as unknown as Appointment;
    appointmentsRepository.findOne.mockResolvedValue(existing);

    await expect(
      service.update(
        'a1',
        {
          startsAt: new Date('2026-08-01T12:00:00Z'),
          endsAt: new Date('2026-08-01T11:00:00Z'),
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when updating client from another store', async () => {
    const existing = {
      id: 'a1',
      storeId: 'store-1',
      startsAt: new Date('2026-08-01T10:00:00Z'),
      endsAt: new Date('2026-08-01T11:00:00Z'),
      status: 'scheduled',
    } as unknown as Appointment;
    appointmentsRepository.findOne.mockResolvedValue(existing);
    usersRepository.findOne.mockResolvedValue({ id: 'c2', storeId: 'other-store' } as User);

    await expect(service.update('a1', { clientId: 'c2' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('applies status filter in findAll when provided', async () => {
    const qb = createQb();

    await service.findAll(actor, {
      page: 1,
      limit: 10,
      status: 'scheduled' as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith('appointment.status = :status', {
      status: 'scheduled',
    });
  });

  it('allows non-admin to access same-store appointment', async () => {
    const employeeActor = { ...actor, role: Role.EMPLOYEE };
    const appointment = { id: 'a1', storeId: 'store-1' } as Appointment;
    appointmentsRepository.findOne.mockResolvedValue(appointment);

    const result = await service.findOne('a1', employeeActor);

    expect(result).toBe(appointment);
  });

  it('updates appointment with valid client and employee reassignment', async () => {
    const existing = {
      id: 'a1',
      storeId: 'store-1',
      startsAt: new Date('2026-08-01T10:00:00Z'),
      endsAt: new Date('2026-08-01T11:00:00Z'),
      status: 'scheduled',
      notes: 'old',
    } as unknown as Appointment;
    const newClient = { id: 'c2', storeId: 'store-1' } as User;
    const newEmployee = { id: 'e2', storeId: 'store-1' } as User;

    appointmentsRepository.findOne.mockResolvedValue(existing);
    usersRepository.findOne.mockResolvedValueOnce(newClient).mockResolvedValueOnce(newEmployee);
    appointmentsRepository.save.mockResolvedValue(existing);

    const result = await service.update(
      'a1',
      {
        clientId: 'c2',
        employeeId: 'e2',
        notes: 'new',
      },
      actor,
    );

    expect(result).toBe(existing);
    expect(existing.clientId).toBe('c2');
    expect(existing.employeeId).toBe('e2');
  });

  it('throws BadRequestException when updating employee to invalid store', async () => {
    const existing = {
      id: 'a1',
      storeId: 'store-1',
      startsAt: new Date('2026-08-01T10:00:00Z'),
      endsAt: new Date('2026-08-01T11:00:00Z'),
      status: 'scheduled',
    } as unknown as Appointment;
    appointmentsRepository.findOne.mockResolvedValue(existing);
    usersRepository.findOne.mockResolvedValue({ id: 'e2', storeId: 'other-store' } as User);

    await expect(service.update('a1', { employeeId: 'e2' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when post-assign dates become invalid', async () => {
    const existing = {
      id: 'a1',
      storeId: 'store-1',
      startsAt: new Date('2026-08-01T10:00:00Z'),
      endsAt: new Date('2026-08-01T11:00:00Z'),
      status: 'scheduled',
    } as unknown as Appointment;
    appointmentsRepository.findOne.mockResolvedValue(existing);

    await expect(
      service.update(
        'a1',
        {
          startsAt: new Date('2026-08-01T12:30:00Z'),
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
