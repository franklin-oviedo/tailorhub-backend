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
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @ManyToOne(() => Store, (store) => store.orders, { nullable: false, onDelete: 'CASCADE' })
  store!: Store;

  @Column({ type: 'uuid' })
  storeId!: string;

  @ManyToOne(() => User, (user) => user.customerOrders, { nullable: false })
  customer!: User;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => User, (user) => user.assignedOrders, { nullable: true })
  employee?: User;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItem[];

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
