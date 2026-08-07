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
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the order item' })
  id: string;

  @Column({ name: 'quantity', type: 'int', comment: 'Quantity of the product in the order item' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2, comment: 'Unit price of the product in the order item' })
  unitPrice: number;

  @Column({ name: 'subtotal', type: 'numeric', precision: 10, scale: 2, comment: 'Subtotal amount for the order item' })
  subtotal: number;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false })
  order: Order;

  @ManyToOne(() => Product, (product) => product.orderItems, { nullable: false })
  product: Product;
}
