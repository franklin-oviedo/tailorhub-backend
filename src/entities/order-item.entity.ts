import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
  order!: Order;

  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Product, (product) => product.orderItems, { nullable: false })
  product!: Product;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal!: number;
}
