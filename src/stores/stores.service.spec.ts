import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../entities/store.entity';
import { StoresService } from './stores.service';

describe('StoresService', () => {
  let service: StoresService;
  let storesRepository: jest.Mocked<Repository<Store>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: getRepositoryToken(Store),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    storesRepository = module.get(getRepositoryToken(Store));
  });

  const createQb = () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 's1' }], 1]),
    };

    storesRepository.createQueryBuilder.mockReturnValue(qb as any);
    return qb;
  };

  it('creates a store successfully', async () => {
    const dto = { name: 'Tailor Hub', email: 'tailor@test.com' };
    const created = { id: 's1', ...dto } as Store;
    storesRepository.findOne.mockResolvedValue(null);
    storesRepository.create.mockReturnValue(created);
    storesRepository.save.mockResolvedValue(created);

    const result = await service.create(dto);

    expect(result).toEqual(created);
  });

  it('throws BadRequestException when creating duplicated store', async () => {
    storesRepository.findOne.mockResolvedValue({ id: 's1' } as Store);

    await expect(
      service.create({ name: 'Tailor', email: 'tailor@test.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when store is missing', async () => {
    storesRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when update email is already taken', async () => {
    const current = { id: 's1', email: 'old@test.com' } as Store;
    storesRepository.findOne
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ id: 's2', email: 'new@test.com' } as Store);

    await expect(service.update('s1', { email: 'new@test.com' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns paginated stores', async () => {
    const qb = createQb();

    const result = await service.findAll({ page: 1, limit: 10, search: 'tailor' });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta.totalItems).toBe(1);
  });

  it('returns paginated stores without search filter', async () => {
    const qb = createQb();

    await service.findAll({} as any);

    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(10);
  });

  it('finds a store successfully', async () => {
    const current = { id: 's1', email: 'same@test.com' } as Store;
    storesRepository.findOne.mockResolvedValue(current);

    const result = await service.findOne('s1');

    expect(result).toBe(current);
  });

  it('updates store successfully when changing email and no duplicate exists', async () => {
    const current = { id: 's1', email: 'old@test.com' } as Store;
    storesRepository.findOne.mockResolvedValueOnce(current).mockResolvedValueOnce(null);
    storesRepository.save.mockResolvedValue({ ...current, email: 'new@test.com' } as Store);

    const result = await service.update('s1', { email: 'new@test.com' });

    expect(result.email).toBe('new@test.com');
  });

  it('updates store successfully when email is not changing', async () => {
    const current = { id: 's1', email: 'same@test.com' } as Store;
    storesRepository.findOne.mockResolvedValue(current);
    storesRepository.save.mockResolvedValue(current);

    const result = await service.update('s1', { name: 'Updated' });

    expect(result).toBe(current);
    expect(storesRepository.save).toHaveBeenCalled();
  });

  it('removes store', async () => {
    const current = { id: 's1', email: 'same@test.com' } as Store;
    storesRepository.findOne.mockResolvedValue(current);
    storesRepository.remove.mockResolvedValue(current);

    await service.remove('s1');

    expect(storesRepository.remove).toHaveBeenCalledWith(current);
  });

  it('throws NotFoundException when removing missing store', async () => {
    storesRepository.findOne.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
