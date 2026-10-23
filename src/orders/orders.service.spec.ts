import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Customers } from '../entities/customer.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { OrderStatusEnum } from '../enums/order.enum';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Repository<Order>>;
  let orderItemsRepository: jest.Mocked<Repository<OrderItem>>;
  let productsRepository: jest.Mocked<Repository<Product>>;
  let customersRepository: jest.Mocked<Repository<Customers>>;

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
        {
          provide: getRepositoryToken(Customers),
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
    customersRepository = module.get(getRepositoryToken(Customers));
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

    ordersRepository.createQueryBuilder.mockReturnValue(qb as never);
    return qb;
  };

  it('creates an order and calculates total amount in backend', async () => {
    const customer = { id: 'c1', store: { id: 'store-1' } } as Customers;
    const product = { id: 'p1', store: { id: 'store-1' }, price: 25 } as Product;
    const itemEntity = { quantity: 2, unitPrice: 25, subtotal: 50 } as OrderItem;
    const orderEntity = { id: 'o1' } as Order;
    const savedOrder = { id: 'o1', totalAmount: 50, status: OrderStatusEnum.PENDING } as Order;

    customersRepository.findOne.mockResolvedValue(customer);
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

    expect(ordersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 50, status: OrderStatusEnum.PENDING }),
    );
    expect(result).toEqual(savedOrder);
  });

  it('throws when customer does not exist', async () => {
    customersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ customerId: 'missing', items: [{ productId: 'p1', quantity: 1 }] }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when product belongs to another store', async () => {
    customersRepository.findOne.mockResolvedValue({ id: 'c1', store: { id: 'store-1' } } as Customers);
    productsRepository.findOne.mockResolvedValue({ id: 'p1', store: { id: 'other-store' }, price: 10 } as Product);

    await expect(
      service.create({ customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }] }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns paginated orders with filters', async () => {
    const qb = createQb();

    const result = await service.findAll(actor, {
      page: 1,
      limit: 10,
      status: OrderStatusEnum.PENDING,
      customerId: 'c1',
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta.totalItems).toBe(1);
  });

  it('throws NotFoundException when order does not exist', async () => {
    ordersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates order status', async () => {
    const order = {
      id: 'o1',
      status: OrderStatusEnum.PENDING,
      store: { id: 'store-1' },
    } as Order;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockResolvedValue({ ...order, status: OrderStatusEnum.COMPLETED } as Order);

    const result = await service.updateStatus('o1', { status: OrderStatusEnum.COMPLETED }, actor);

    expect(result.status).toBe(OrderStatusEnum.COMPLETED);
  });
});
