import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { User } from './user.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, (store) => store.appointments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  store!: Store;

  @Column({ type: 'uuid' })
  storeId!: string;

  @ManyToOne(() => User, (user) => user.clientAppointments, { nullable: false })
  client!: User;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => User, (user) => user.employeeAppointments, { nullable: false })
  employee!: User;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'timestamptz' })
  endsAt!: Date;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status!: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
