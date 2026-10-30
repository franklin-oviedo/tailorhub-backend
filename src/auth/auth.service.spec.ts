import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Store } from '../entities/store.entity';
import { User } from '../entities/user.entity';
import { Customers } from '../entities/customer.entity';
import { Employee } from '../entities/employee.entity';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let storesRepository: jest.Mocked<Repository<Store>>;
  let customersRepository: jest.Mocked<Repository<Customers>>;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
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
          provide: getRepositoryToken(Customers),
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
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
    storesRepository = module.get(getRepositoryToken(Store));
    customersRepository = module.get(getRepositoryToken(Customers));
    employeeRepository = module.get(getRepositoryToken(Employee));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers user and returns access token', async () => {
    const dto = {
      fullName: 'John Doe',
      email: 'john@test.com',
      password: 'password123',
      storeId: 'store-1',
      role: Role.CLIENT,
    };
    const store = { id: 'store-1' } as Store;
    const createdUser = { id: 'u1', email: dto.email, role: dto.role, storeId: store.id } as User;
    const savedUser = { ...createdUser } as User;

    usersRepository.findOne.mockResolvedValue(null);
    storesRepository.findOne.mockResolvedValue(store);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersRepository.create.mockReturnValue(createdUser);
    usersRepository.save.mockResolvedValue(savedUser);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.register(dto);

    expect(result).toEqual({ accessToken: 'jwt-token' });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'hashed-password',
        role: Role.CLIENT,
        store: expect.objectContaining({ id: 'store-1' }),
      }),
    );
  });

  it('throws when email is already in use', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'u1' } as User);

    await expect(
      service.register({
        fullName: 'Taken',
        email: 'taken@test.com',
        password: 'password123',
        storeId: 'store-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when store does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    storesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.register({
        fullName: 'No Store',
        email: 'nostore@test.com',
        password: 'password123',
        storeId: 'missing-store',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when login credentials are invalid', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@test.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when password does not match', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'u1', password: 'hash' } as User);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'user@test.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns token on successful login', async () => {
    const user = {
      id: 'u1',
      email: 'user@test.com',
      password: 'hash',
      role: Role.ADMIN,
      store: { id: 'store-1' },
    } as User;
    usersRepository.findOne.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({ email: 'user@test.com', password: 'password123' });

    expect(result).toEqual({ accessToken: 'jwt-token' });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'u1', email: 'user@test.com', storeId: 'store-1' }),
    );
  });

  it('uses default client role when register role is not provided', async () => {
    const dto = {
      fullName: 'No Role',
      email: 'norole@test.com',
      password: 'password123',
      storeId: 'store-1',
    };

    usersRepository.findOne.mockResolvedValue(null);
    storesRepository.findOne.mockResolvedValue({ id: 'store-1' } as Store);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersRepository.create.mockImplementation((payload) => payload as User);
    usersRepository.save.mockImplementation(async (u) => ({ id: 'u2', ...u } as User));
    jwtService.signAsync.mockResolvedValue('jwt-token');

    await service.register(dto);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.CLIENT }),
    );
  });

  it('rejects privileged roles during public registration', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    storesRepository.findOne.mockResolvedValue({ id: 'store-1' } as Store);

    await expect(
      service.register({
        fullName: 'Privileged User',
        email: 'manager@test.com',
        password: 'password123',
        storeId: 'store-1',
        role: Role.MANAGER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(usersRepository.create).not.toHaveBeenCalled();
  });
});
