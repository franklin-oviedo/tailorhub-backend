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
import { Employee } from './employee.entity';
import { Customers } from './customer.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the store' })
  id: string;

  @Column({ name: 'name', length: 120, nullable: false, comment: 'Name of the store' })
  name: string;

  @Column({ name: 'email', type: 'varchar', unique: true, length: 160, nullable: true, comment: 'Email of the store' })
  email: string | null;

  @Column({ name: 'phone', nullable: true, length: 30, comment: 'Phone number of the store' })
  phone: string;

  @Column({ name: 'address', type: 'varchar', nullable: true, length: 255, comment: 'Address of the store' })
  address: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the store' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the store' })
  updatedAt: Date;

  @ManyToOne(() => Plan, (plan) => plan.stores, { nullable: true, cascade: true })
  plan: Plan | null;

  @OneToMany(() => User, (user) => user.store)
  users: User[];

  @OneToMany(() => Product, (product) => product.store, { nullable: false })
  products: Product[];

  @OneToMany(() => Order, (order) => order.store, { nullable: false })
  orders: Order[];

  @OneToMany(() => Appointment, (appointment) => appointment.store, { nullable: false })
  appointments: Appointment[];

  @OneToMany(() => Customers, (customer) => customer.store, { nullable: false, cascade: true })
  customers: Customers[];

  @OneToMany(() => Employee, (employee) => employee.store, { nullable: false, cascade: true })
  employees: Employee[];
}
