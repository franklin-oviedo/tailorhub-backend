import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ListStoresQueryDto } from './dto/list-stores-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';

@Injectable()
export class StoresService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
  ) {}
  /* c8 ignore stop */

  async create(createStoreDto: CreateStoreDto): Promise<Store> {
    const existingStore = await this.storesRepository.findOne({
      where: [
        { phone: createStoreDto.phone },
        { email: createStoreDto.email },
      ],
    });

    if (existingStore) {
      throw new BadRequestException('A store with that phone already exists.');
    }

    const store = this.storesRepository.create(createStoreDto);
    return this.storesRepository.save(store);
  }

  async findAll(query: ListStoresQueryDto): Promise<PaginatedResult<Store>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.storesRepository.createQueryBuilder('store');

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere('(store.name ILIKE :search OR store.email ILIKE :search)', {
        search: searchPattern,
      });
    }

    qb.orderBy('store.createdAt', 'DESC').skip(skip).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(id: string): Promise<Store> {
    const store = await this.storesRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);

    if (updateStoreDto.email && updateStoreDto.email !== store.email || updateStoreDto.phone && updateStoreDto.phone !== store.phone) {
      const existingStore = await this.storesRepository.findOne({
        where: [
          { email: updateStoreDto.email },
          { phone: updateStoreDto.phone },
        ],
      });

      if (existingStore) {
        if (existingStore.email === updateStoreDto.email) {
          throw new BadRequestException('A store with that email already exists.');
        }
        if (existingStore.phone === updateStoreDto.phone) {
          throw new BadRequestException('A store with that phone already exists.');
        }
      }
    }

    Object.assign(store, updateStoreDto);
    return this.storesRepository.save(store);
  }

  async remove(id: string): Promise<void> {
    const store = await this.findOne(id);
    await this.storesRepository.remove(store);
  }
}
