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

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the product' })
  id: string;

  @Column({ name: 'name', length: 120, nullable: false, comment: 'Name of the product' })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true, comment: 'Description of the product' })
  description: string;

  @Column({ name: 'price', type: 'numeric', precision: 10, scale: 2, nullable: false, comment: 'Price of the product' })
  price: number;

  @Column({ name: 'is_active', default: true, nullable: false, comment: 'Indicates if the product is active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the product' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the product' })
  updatedAt: Date;

  @ManyToOne(() => Store, (store) => store.products)
  store: Store;

  @OneToMany(() => OrderItem, (item) => item.product, { nullable: false, cascade: true })
  orderItems: OrderItem[];
}
