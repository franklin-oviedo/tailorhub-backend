import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;

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
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
  });

  const createQb = () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
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
    const target = { id: 'user-1', email: 'old@test.com', role: Role.EMPLOYEE, storeId: 'store-1' } as User;
    usersRepository.findOne
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce({ id: 'another' } as User);

    await expect(service.update('user-1', { email: 'taken@test.com' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
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
});
