import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { Appointment } from './appointment.entity';
import { Plan } from './plan.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true, length: 160 })
  email!: string;

  @Column({ nullable: true, length: 30 })
  phone?: string;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @ManyToOne(() => User, (user) => user.managedStores, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  manager?: User;

  @Column({ type: 'uuid', nullable: true })
  managerId?: string;

  @ManyToOne(() => Plan, (plan) => plan.stores, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  plan?: Plan;

  @Column({ type: 'uuid', nullable: true })
  planId?: string;

  @OneToMany(() => User, (user) => user.store)
  users!: User[];

  @OneToMany(() => Product, (product) => product.store)
  products!: Product[];

  @OneToMany(() => Order, (order) => order.store)
  orders!: Order[];

  @OneToMany(() => Appointment, (appointment) => appointment.store)
  appointments!: Appointment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
