import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const actor = { sub: 'u1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 's1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('delegates findAll', async () => {
    const query = { page: 1, limit: 10 };
    productsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(actor, query);

    expect(productsService.findAll).toHaveBeenCalledWith(actor, query);
  });

  it('returns success message on remove', async () => {
    productsService.remove.mockResolvedValue(undefined);

    const result = await controller.remove('p1', actor);

    expect(result).toEqual({ message: 'Product deleted successfully.' });
  });
});
