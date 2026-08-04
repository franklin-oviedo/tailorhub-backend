import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  const ordersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  const actor = { sub: 'u1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 's1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('delegates findAll', async () => {
    const query = { page: 1, limit: 10 };
    ordersService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(actor, query);

    expect(ordersService.findAll).toHaveBeenCalledWith(actor, query);
  });

  it('returns success message on remove', async () => {
    ordersService.remove.mockResolvedValue(undefined);

    const result = await controller.remove('o1', actor);

    expect(result).toEqual({ message: 'Order deleted successfully.' });
  });
});
