import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Store } from './store.entity';
import { Role } from '../common/enums/role.enum';
import { Customers } from './customer.entity';
import { Employee } from './employee.entity';
import { JoinColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the user' })
  id: string;

  @Column({ name: 'password', length: 255,  nullable: false, comment: 'Password of the user' })
  password: string;

  @Column({ name: 'role', type: 'enum', enum: Role, default: Role.CLIENT, comment: 'Role of the user' })
  role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the user' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the user' })
  updatedAt: Date;

  @OneToOne(() => Customers, (customer) => customer.user, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customers;

  @ManyToOne(() => Store, (store) => store.users, { nullable: false, cascade: true })
  store: Store;

  @OneToOne(() => Employee, (employee) => employee.user, { nullable: true, cascade: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
