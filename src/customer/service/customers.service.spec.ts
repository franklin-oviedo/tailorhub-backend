import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customers } from '../../entities/customer.entity';
import { CustomersService } from './customers.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<Repository<Customers>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customers),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get(getRepositoryToken(Customers));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates customer with actor store', async () => {
    const dto = {
      name: 'Ana Martinez',
      email: 'ana@example.com',
      phone: '3001234567',
    };
    const actor: JwtPayload = {
      sub: 'u1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };
    const created = { id: 'c1', ...dto } as Customers;

    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.createCustomer(dto, actor)).resolves.toBe(created);
    expect(repository.create).toHaveBeenCalledWith({
      ...dto,
      store: { id: actor.storeId },
    });
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  it('returns customer by id when it exists', async () => {
    const customer = { id: 'c1' } as Customers;
    repository.findOne.mockResolvedValue(customer);

    await expect(service.getCustomerById('c1')).resolves.toBe(customer);
  });

  it('throws when customer does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getCustomerById('missing')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates customer when it belongs to actor store', async () => {
    const actor: JwtPayload = {
      sub: 'u1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };
    const existing = {
      id: 'c1',
      name: 'Ana Martinez',
      email: 'ana@example.com',
      phone: '3001234567',
      store: { id: 'store-1' },
    } as Customers;
    const dto = { name: 'Ana M. Martinez' };

    repository.findOne.mockResolvedValue(existing);
    repository.save.mockResolvedValue({ ...existing, ...dto } as Customers);

    await expect(service.updateCustomer('c1', dto, actor)).resolves.toMatchObject({
      id: 'c1',
      name: 'Ana M. Martinez',
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana M. Martinez' }));
  });

  it('throws when updating a non-existing customer', async () => {
    const actor: JwtPayload = {
      sub: 'u1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };

    repository.findOne.mockResolvedValue(null);

    await expect(service.updateCustomer('missing', { name: 'New Name' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when customer belongs to another store', async () => {
    const actor: JwtPayload = {
      sub: 'u1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      storeId: 'store-1',
    };
    const existing = {
      id: 'c1',
      store: { id: 'store-2' },
    } as Customers;

    repository.findOne.mockResolvedValue(existing);

    await expect(service.updateCustomer('c1', { phone: '123456' }, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
