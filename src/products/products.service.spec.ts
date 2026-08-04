import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Role } from '../common/enums/role.enum';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;

  const baseUser = {
    sub: 'user-1',
    email: 'user@test.com',
    role: Role.EMPLOYEE,
    storeId: 'store-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  const createQb = () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'p1' }], 1]),
    };

    repository.createQueryBuilder.mockReturnValue(qb as any);
    return qb;
  };

  it('should create a product with actor storeId', async () => {
    const dto = { name: 'Saco', price: 99.99, isActive: true };
    const created = { id: 'p1', ...dto, storeId: 'store-1' } as Product;

    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.create(dto, baseUser);

    expect(repository.create).toHaveBeenCalledWith({ ...dto, storeId: 'store-1' });
    expect(result).toEqual(created);
  });

  it('should throw NotFoundException when product does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', baseUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw ForbiddenException for cross-store access', async () => {
    repository.findOne.mockResolvedValue({ id: 'p2', storeId: 'other-store' } as Product);

    await expect(service.findOne('p2', baseUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should allow admin to access cross-store product', async () => {
    const adminUser = { ...baseUser, role: Role.ADMIN };
    const product = { id: 'p3', storeId: 'other-store' } as Product;
    repository.findOne.mockResolvedValue(product);

    const result = await service.findOne('p3', adminUser);

    expect(result).toEqual(product);
  });

  it('should return paginated products with filters for non-admin', async () => {
    const qb = createQb();

    const result = await service.findAll(baseUser, {
      page: 2,
      limit: 5,
      search: 'sa',
      isActive: true,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('product');
    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result.meta.totalItems).toBe(1);
  });

  it('should return paginated products for admin without filters', async () => {
    const qb = createQb();
    const adminUser = { ...baseUser, role: Role.ADMIN };

    await service.findAll(adminUser, { page: 1, limit: 10 });

    expect(qb.andWhere).not.toHaveBeenCalledWith('product.storeId = :storeId', expect.anything());
    expect(qb.orderBy).toHaveBeenCalled();
  });

  it('should allow non-admin to access product in same store', async () => {
    const product = { id: 'p10', storeId: 'store-1' } as Product;
    repository.findOne.mockResolvedValue(product);

    const result = await service.findOne('p10', baseUser);

    expect(result).toEqual(product);
  });

  it('should apply isActive false filter explicitly', async () => {
    const qb = createQb();

    await service.findAll(baseUser, {
      page: 1,
      limit: 10,
      isActive: false,
    });

    expect(qb.andWhere).toHaveBeenCalledWith('product.isActive = :isActive', { isActive: false });
  });

  it('should paginate non-admin products without optional filters', async () => {
    const qb = createQb();

    await service.findAll(baseUser, {} as any);

    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(10);
  });

  it('should update and save product', async () => {
    const product = { id: 'p1', storeId: 'store-1', name: 'Old' } as Product;
    repository.findOne.mockResolvedValue(product);
    repository.save.mockResolvedValue({ ...product, name: 'New' } as Product);

    const result = await service.update('p1', { name: 'New' }, baseUser);

    expect(repository.save).toHaveBeenCalled();
    expect(result.name).toBe('New');
  });

  it('should remove product', async () => {
    const product = { id: 'p1', storeId: 'store-1' } as Product;
    repository.findOne.mockResolvedValue(product);
    repository.remove.mockResolvedValue(product);

    await service.remove('p1', baseUser);

    expect(repository.remove).toHaveBeenCalledWith(product);
  });
});
