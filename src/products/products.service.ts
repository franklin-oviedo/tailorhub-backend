import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';

@Injectable()
export class ProductsService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}
  /* c8 ignore stop */

  create(createProductDto: CreateProductDto, actor: JwtPayload): Promise<Product> {
    const product = this.productsRepository.create({
      ...createProductDto,
      storeId: actor.storeId,
    });

    return this.productsRepository.save(product);
  }

  async findAll(
    actor: JwtPayload,
    query: ListProductsQueryDto,
  ): Promise<PaginatedResult<Product>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.productsRepository.createQueryBuilder('product');

    if (actor.role !== Role.ADMIN) {
      qb.andWhere('product.storeId = :storeId', { storeId: actor.storeId });
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', {
        search: searchPattern,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('product.createdAt', 'DESC').skip(skip).take(limit);

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

  async findOne(id: string, actor: JwtPayload): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (actor.role !== Role.ADMIN && product.storeId !== actor.storeId) {
      throw new ForbiddenException('You cannot access products from another store.');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    actor: JwtPayload,
  ): Promise<Product> {
    const product = await this.findOne(id, actor);
    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const product = await this.findOne(id, actor);
    await this.productsRepository.remove(product);
  }
}
