import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { OrderItem } from './order-item.entity';
import { Customers } from './customer.entity';
import { OrderStatusEnum } from 'src/enums/order.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the order' })
  id: string;

  @Column({ name: 'status', type: 'enum', enum: OrderStatusEnum, default: OrderStatusEnum.PENDING, comment: 'Status of the order' })
  status: OrderStatusEnum;

  @Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2, default: 0, comment: 'Total amount of the order' })
  totalAmount: number;

  @Column({ name: 'notes', type: 'text', nullable: true, comment: 'Additional notes for the order' })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the order' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the order' })
  updatedAt: Date;

  @ManyToOne(() => Store, (store) => store.orders, { nullable: false })
  store: Store;

  @OneToMany(() => OrderItem, (item) => item.order, { nullable: false, cascade: true })
  items: OrderItem[];

  @ManyToOne(() => Customers, (customer) => customer.orders, { nullable: false })
  customer: Customers;
}
