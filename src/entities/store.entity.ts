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

  @Column({ name: 'name', length: 120, unique: true, nullable: false, comment: 'Name of the store' })
  name: string;

  @Column({ name: 'email', type: 'varchar', unique: true, length: 160, nullable: true, comment: 'Email of the store' })
  email: string | null;

  @Column({ name: 'phone', nullable: false, length: 30, comment: 'Phone number of the store' })
  phone: string;

  @Column({ name: 'address', type: 'varchar', nullable: false, length: 255, comment: 'Address of the store' })
  address: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the store' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the store' })
  updatedAt: Date;

  @ManyToOne(() => Plan, (plan) => plan.stores, { nullable: true, cascade: true })
  plan: Plan | null;

  @OneToMany(() => User, (user) => user.store)
  users: User[];

  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  @OneToMany(() => Order, (order) => order.store)
  orders: Order[];

  @OneToMany(() => Appointment, (appointment) => appointment.store)
  appointments: Appointment[];

  @OneToMany(() => Customers, (customer) => customer.store)
  customers: Customers[];

  @OneToMany(() => Employee, (employee) => employee.store)
  employees: Employee[];
}
