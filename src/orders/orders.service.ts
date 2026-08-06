import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderStatusEnum } from '../enums/order.enum';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { Customers } from 'src/entities/customer.entity';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class OrdersService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
  ) {}
  /* c8 ignore stop */

  async create(createOrderDto: CreateOrderDto, actor: JwtPayload): Promise<Order> {
    const customer = await this.customersRepository.findOne({
      where: { id: createOrderDto.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }

    if (customer.store.id !== actor.storeId) {
      throw new ForbiddenException('Customer belongs to another store.');
    }

    const items: OrderItem[] = [];
    let totalAmount = 0;

    for (const itemDto of createOrderDto.items) {
      const product = await this.productsRepository.findOne({
        where: { id: itemDto.productId },
      });

      if (!product) {
        throw new BadRequestException(`Product ${itemDto.productId} not found.`);
      }

      if (product.store.id !== actor.storeId) {
        throw new ForbiddenException('You cannot add products from another store.');
      }

      const unitPrice = Number(product.price);
      const subtotal = Number((unitPrice * itemDto.quantity).toFixed(2));

      totalAmount += subtotal;

      items.push(
        this.orderItemsRepository.create({
          product,
          quantity: itemDto.quantity,
          unitPrice,
          subtotal,
        }),
      );
    }

    const order = this.ordersRepository.create({
      customer,
      items,
      totalAmount: Number(totalAmount.toFixed(2)),
      notes: createOrderDto.notes,
      status: OrderStatusEnum.PENDING,
    });

    return this.ordersRepository.save(order);
  }

  async findAll(actor: JwtPayload, query: ListOrdersQueryDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('order.storeId = :storeId', { storeId: actor.storeId });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.customerId) {
      qb.andWhere('order.customerId = :customerId', { customerId: query.customerId });
    }

    qb.orderBy('order.createdAt', 'DESC').skip(skip).take(limit);
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

  async findOne(id: string, actor: JwtPayload): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['customer', 'store'],
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (!isSuperAdmin(actor.role) && order.store.id !== actor.storeId) {
      throw new ForbiddenException('You cannot access orders from another store.');
    }

    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actor: JwtPayload,
  ): Promise<Order> {
    const order = await this.findOne(id, actor);
    order.status = dto.status;
    order.notes = dto.notes ?? order.notes;
    return this.ordersRepository.save(order);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const order = await this.findOne(id, actor);
    await this.ordersRepository.remove(order);
  }
}
