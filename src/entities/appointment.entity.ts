import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Customers } from './customer.entity';
import { AppointmentStatusEnum } from '../enums/appointments.enum';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the appointment' })
  id: string;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: false, comment: 'Scheduled date and time of the appointment' })
  scheduledAt: Date;

  @Column({ name: 'status', type: 'enum', enum: AppointmentStatusEnum, default: AppointmentStatusEnum.SCHEDULED, comment: 'Current status of the appointment' })
  status: AppointmentStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true, comment: 'Additional notes for the appointment' })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the appointment' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the appointment' })
  updatedAt: Date;

  @ManyToOne(() => Customers, (customer) => customer.appointments, { nullable: false, cascade: true })
  customer: Customers;
  
  @ManyToOne(() => Store, (store) => store.appointments, { nullable: false, cascade: true })
  store: Store;
}
