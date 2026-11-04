import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Customers } from '../entities/customer.entity';
import { Employee } from '../entities/employee.entity';
import { Store } from '../entities/store.entity';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let customersRepository: jest.Mocked<Repository<Customers>>;
  let employeesRepository: jest.Mocked<Repository<Employee>>;
  let storesRepository: jest.Mocked<Repository<Store>>;

  const actor = {
    sub: 'user-1',
    email: 'user@test.com',
    role: Role.EMPLOYEE,
    storeId: 'store-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Customers),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Store),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    customersRepository = module.get(getRepositoryToken(Customers));
    employeesRepository = module.get(getRepositoryToken(Employee));
    storesRepository = module.get(getRepositoryToken(Store));
  });

  const createQb = () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'u1' }], 1]),
    };

    usersRepository.createQueryBuilder.mockReturnValue(qb as any);
    return qb;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when user does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an employee user for manager in own store', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };

    const dto = {
      fullName: 'Employee Demo',
      email: 'employee@tailorhub.com',
      phone: '+57 300 000 1111',
      password: 'An0therPass!',
      role: Role.EMPLOYEE,
    };

    storesRepository.findOne.mockResolvedValue({ id: 'store-1' } as Store);
    usersRepository.findOne.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    employeesRepository.create.mockReturnValue({ id: 'emp-1' } as Employee);
    employeesRepository.save.mockResolvedValue({ id: 'emp-1' } as Employee);
    usersRepository.create.mockReturnValue({ id: 'u2' } as User);
    usersRepository.save.mockResolvedValue({ id: 'u2' } as User);

    const created = await service.create(dto, managerActor);

    expect(created.id).toBe('u2');
    expect(storesRepository.findOne).toHaveBeenCalledWith({ where: { id: 'store-1' } });
    expect(usersRepository.save).toHaveBeenCalled();
  });

  it('throws ForbiddenException when manager tries to create admin user', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };

    await expect(
      service.create(
        {
          fullName: 'Admin Demo',
          email: 'admin2@tailorhub.com',
          phone: '+57 300 000 2222',
          password: 'An0therPass!',
          role: Role.ADMIN,
        },
        managerActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException for cross-store user access', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'u2', storeId: 'other-store' } as User);

    await expect(service.findOne('u2', actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hashes password before saving update', async () => {
    const target = { id: 'user-1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);
    usersRepository.save.mockResolvedValue({ ...target, password: 'hashed' } as User);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    await service.update('user-1', { password: 'new-password' }, actor);

    expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed' }));
  });

  it('throws BadRequestException when updating to an already used email', async () => {
    const target = {
      id: 'user-1',
      role: Role.EMPLOYEE,
      storeId: 'store-1',
      customer: { email: 'old@test.com' },
    } as User;
    usersRepository.findOne
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce({ id: 'another' } as User);

    await expect(service.update('user-1', { email: 'taken@test.com' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usersRepository.findOne).toHaveBeenCalledTimes(2);
  });

  it('returns paginated users with filters', async () => {
    const qb = createQb();

    const result = await service.findAll(actor, {
      page: 1,
      limit: 10,
      search: 'john',
      role: Role.EMPLOYEE,
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta.totalItems).toBe(1);
  });

  it('throws ForbiddenException when non-admin tries to change role', async () => {
    const target = { id: 'user-1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.update('user-1', { role: Role.ADMIN }, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when non-admin tries to move user to another store', async () => {
    const target = { id: 'user-1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.update('user-1', { storeId: 'other-store' }, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when non-admin removes another user', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'user-2' } as User);

    await expect(service.remove('user-2', actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes own account', async () => {
    const me = { id: 'user-1' } as User;
    usersRepository.findOne.mockResolvedValue(me);
    usersRepository.remove.mockResolvedValue(me);

    await service.remove('user-1', actor);

    expect(usersRepository.remove).toHaveBeenCalledWith(me);
  });

  it('allows admin to change role within same store', async () => {
    const adminActor = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };
    const target = { id: 'user-1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);
    usersRepository.save.mockResolvedValue({ ...target, role: Role.MANAGER } as User);

    const result = await service.update('user-1', { role: Role.MANAGER }, adminActor);

    expect(result.role).toBe(Role.MANAGER);
  });

  it('returns user for same-store non-admin actor', async () => {
    const user = { id: 'user-9', storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(user);

    const result = await service.findOne('user-9', actor);

    expect(result).toBe(user);
  });

  it('returns paginated users for admin without store filter', async () => {
    const qb = createQb();
    const adminActor = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };

    await service.findAll(adminActor, {} as any);

    expect(qb.orderBy).toHaveBeenCalled();
  });

  it('applies store filter when manager lists users', async () => {
    const qb = createQb();
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };

    await service.findAll(managerActor, {} as any);

    expect(qb.andWhere).toHaveBeenCalledWith('user.storeId = :storeId', { storeId: 'store-1' });
  });

  it('returns my profile with selected fields', async () => {
    const profile = { id: 'user-1', email: 'user@test.com' } as User;
    usersRepository.findOne.mockResolvedValue(profile);

    const result = await service.findMyProfile('user-1');

    expect(result).toBe(profile);
    expect(usersRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });

  it('throws ForbiddenException when non-admin updates someone else', async () => {
    const target = { id: 'user-2', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.update('user-2', { fullName: 'x' }, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when removing non-existing user', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.remove('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows admin to remove another user', async () => {
    const adminActor = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };
    const target = { id: 'user-2' } as User;
    usersRepository.findOne.mockResolvedValue(target);
    usersRepository.remove.mockResolvedValue(target);

    await service.remove('user-2', adminActor);

    expect(usersRepository.remove).toHaveBeenCalledWith(target);
  });

  it('throws NotFoundException when updating non-existing user', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.update('missing', { fullName: 'x' }, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when manager updates user from another store', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.EMPLOYEE, storeId: 'other-store' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.update('user-2', { fullName: 'x' }, managerActor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when manager tries to assign super admin role', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.update('user-2', { role: Role.SUPER_ADMIN }, managerActor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when manager tries to move user across stores', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.update('user-2', { storeId: 'other-store' }, managerActor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows manager to update same-store user details', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.EMPLOYEE, storeId: 'store-1', email: 'u@test.com' } as User;
    usersRepository.findOne.mockResolvedValue(target);
    usersRepository.save.mockResolvedValue({ ...target, fullName: 'Updated Name' } as User);

    const result = await service.update('user-2', { fullName: 'Updated Name' }, managerActor);

    expect(result.fullName).toBe('Updated Name');
  });

  it('allows manager to remove same-store non-super-admin user', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);
    usersRepository.remove.mockResolvedValue(target);

    await service.remove('user-2', managerActor);

    expect(usersRepository.remove).toHaveBeenCalledWith(target);
  });

  it('throws ForbiddenException when manager removes super admin', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.SUPER_ADMIN, storeId: 'store-1' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.remove('user-2', managerActor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when manager removes user from another store', async () => {
    const managerActor = {
      sub: 'manager-1',
      email: 'manager@test.com',
      role: Role.MANAGER,
      storeId: 'store-1',
    };
    const target = { id: 'user-2', role: Role.EMPLOYEE, storeId: 'other-store' } as User;
    usersRepository.findOne.mockResolvedValue(target);

    await expect(service.remove('user-2', managerActor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('disables user and employee profile', async () => {
    const adminActor = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };
    const target = {
      id: 'user-2',
      role: Role.EMPLOYEE,
      isActive: true,
      storeId: 'store-1',
      employee: { id: 'emp-1', active: true },
    } as User;
    usersRepository.findOne.mockResolvedValue(target);
    employeesRepository.save.mockResolvedValue({ id: 'emp-1', active: false } as Employee);
    usersRepository.save.mockResolvedValue({ ...target, isActive: false } as User);

    await service.disable('user-2', adminActor);

    expect(employeesRepository.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('throws ForbiddenException when disabling super admin', async () => {
    const adminActor = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };

    usersRepository.findOne.mockResolvedValue({ id: 'user-2', role: Role.SUPER_ADMIN } as User);

    await expect(service.disable('user-2', adminActor)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
