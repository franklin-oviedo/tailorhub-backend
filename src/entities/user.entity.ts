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
import { Order } from './order.entity';
import { Appointment } from './appointment.entity';
import { Role } from '../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  fullName!: string;

  @Column({ unique: true, length: 160 })
  email!: string;

  @Column({ length: 255 })
  password!: string;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role!: Role;

  @ManyToOne(() => Store, (store) => store.users, { nullable: false, onDelete: 'CASCADE' })
  store!: Store;

  @Column({ type: 'uuid' })
  storeId!: string;

  @OneToMany(() => Order, (order) => order.customer)
  customerOrders!: Order[];

  @OneToMany(() => Order, (order) => order.employee)
  assignedOrders!: Order[];

  @OneToMany(() => Appointment, (appointment) => appointment.client)
  clientAppointments!: Appointment[];

  @OneToMany(() => Appointment, (appointment) => appointment.employee)
  employeeAppointments!: Appointment[];

  @OneToMany(() => Store, (store) => store.manager)
  managedStores!: Store[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
