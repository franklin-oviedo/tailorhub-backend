import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Repository<Order>>;
  let orderItemsRepository: jest.Mocked<Repository<OrderItem>>;
  let productsRepository: jest.Mocked<Repository<Product>>;
  let usersRepository: jest.Mocked<Repository<User>>;

  const actor = {
    sub: 'u-admin',
    email: 'admin@test.com',
    role: Role.ADMIN,
    storeId: 'store-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<OrdersService>(OrdersService);
    ordersRepository = module.get(getRepositoryToken(Order));
    orderItemsRepository = module.get(getRepositoryToken(OrderItem));
    productsRepository = module.get(getRepositoryToken(Product));
    usersRepository = module.get(getRepositoryToken(User));
  });

  const createQb = () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'o1' }], 1]),
    };

    ordersRepository.createQueryBuilder.mockReturnValue(qb as any);
    return qb;
  };

  it('should create an order and calculate total amount', async () => {
    const customer = { id: 'c1', storeId: 'store-1' } as User;
    const product = { id: 'p1', storeId: 'store-1', price: 25 } as Product;
    const itemEntity = { productId: 'p1', quantity: 2, unitPrice: 25, subtotal: 50 } as OrderItem;
    const orderEntity = { id: 'o1' } as Order;
    const savedOrder = { id: 'o1', totalAmount: 50, status: OrderStatus.PENDING } as Order;

    usersRepository.findOne.mockResolvedValue(customer);
    productsRepository.findOne.mockResolvedValue(product);
    orderItemsRepository.create.mockReturnValue(itemEntity);
    ordersRepository.create.mockReturnValue(orderEntity);
    ordersRepository.save.mockResolvedValue(savedOrder);

    const result = await service.create(
      {
        customerId: 'c1',
        items: [{ productId: 'p1', quantity: 2 }],
      },
      actor,
    );

    expect(orderItemsRepository.create).toHaveBeenCalled();
    expect(ordersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 50, status: OrderStatus.PENDING }),
    );
    expect(result).toEqual(savedOrder);
  });

  it('should fail when customer does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ customerId: 'missing', items: [{ productId: 'p1', quantity: 1 }] }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should fail when product belongs to another store', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'c1', storeId: 'store-1' } as User);
    productsRepository.findOne.mockResolvedValue({ id: 'p1', storeId: 'other-store', price: 10 } as Product);

    await expect(
      service.create({ customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }] }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should fail when customer belongs to another store', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'c1', storeId: 'other-store' } as User);

    await expect(
      service.create({ customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }] }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should fail when employee belongs to another store', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce({ id: 'c1', storeId: 'store-1' } as User)
      .mockResolvedValueOnce({ id: 'e1', storeId: 'other-store' } as User);

    await expect(
      service.create(
        { customerId: 'c1', employeeId: 'e1', items: [{ productId: 'p1', quantity: 1 }] },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should fail when employee does not exist', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce({ id: 'c1', storeId: 'store-1' } as User)
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        { customerId: 'c1', employeeId: 'e1', items: [{ productId: 'p1', quantity: 1 }] },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should fail when product does not exist', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'c1', storeId: 'store-1' } as User);
    productsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ customerId: 'c1', items: [{ productId: 'missing', quantity: 1 }] }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return paginated orders with filters', async () => {
    const qb = createQb();

    const result = await service.findAll(actor, {
      page: 1,
      limit: 10,
      status: OrderStatus.PENDING,
      customerId: 'c1',
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta.totalItems).toBe(1);
  });

  it('should throw NotFoundException in findOne when missing', async () => {
    ordersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should update order status', async () => {
    const order = { id: 'o1', storeId: 'store-1', status: OrderStatus.PENDING } as Order;
    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockResolvedValue({ ...order, status: OrderStatus.COMPLETED } as Order);

    const result = await service.updateStatus(
      'o1',
      { status: OrderStatus.COMPLETED, notes: 'done' },
      actor,
    );

    expect(result.status).toBe(OrderStatus.COMPLETED);
    expect(ordersRepository.save).toHaveBeenCalled();
  });

  it('should remove order', async () => {
    const order = { id: 'o1', storeId: 'store-1' } as Order;
    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.remove.mockResolvedValue(order);

    await service.remove('o1', actor);

    expect(ordersRepository.remove).toHaveBeenCalledWith(order);
  });

  it('should scope findAll by store for non-admin', async () => {
    const qb = createQb();
    const employeeActor = { ...actor, role: Role.EMPLOYEE };

    await service.findAll(employeeActor, { page: 1, limit: 10 });

    expect(qb.andWhere).toHaveBeenCalledWith('order.storeId = :storeId', {
      storeId: 'store-1',
    });
  });

  it('should block findOne cross-store for non-admin', async () => {
    const employeeActor = { ...actor, role: Role.EMPLOYEE };
    ordersRepository.findOne.mockResolvedValue({ id: 'o1', storeId: 'other-store' } as Order);

    await expect(service.findOne('o1', employeeActor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should allow admin to access cross-store order', async () => {
    const order = { id: 'o1', storeId: 'other-store' } as Order;
    ordersRepository.findOne.mockResolvedValue(order);

    const result = await service.findOne('o1', actor);

    expect(result).toBe(order);
  });

  it('should return paginated orders without optional filters', async () => {
    const qb = createQb();

    await service.findAll(actor, {} as any);

    expect(qb.orderBy).toHaveBeenCalled();
    expect(qb.skip).toHaveBeenCalledWith(0);
  });

  it('should create order with assigned employee in same store', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce({ id: 'c1', storeId: 'store-1' } as User)
      .mockResolvedValueOnce({ id: 'e1', storeId: 'store-1' } as User);
    productsRepository.findOne.mockResolvedValue({ id: 'p1', storeId: 'store-1', price: 10 } as Product);
    orderItemsRepository.create.mockImplementation((payload) => payload as OrderItem);
    ordersRepository.create.mockImplementation((payload) => payload as Order);
    ordersRepository.save.mockImplementation(async (payload) => payload as Order);

    const result = await service.create(
      { customerId: 'c1', employeeId: 'e1', items: [{ productId: 'p1', quantity: 1 }] },
      actor,
    );

    expect(result.employeeId).toBe('e1');
  });

  it('should preserve notes when updateStatus dto has no notes', async () => {
    const order = {
      id: 'o1',
      storeId: 'store-1',
      status: OrderStatus.PENDING,
      notes: 'keep-me',
    } as Order;
    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockResolvedValue({ ...order, status: OrderStatus.IN_PROGRESS } as Order);

    const result = await service.updateStatus('o1', { status: OrderStatus.IN_PROGRESS }, actor);

    expect(result.notes).toBe('keep-me');
  });
});
