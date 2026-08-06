import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Customers } from './customer.entity';

@Entity('customer_measurements')
export class CustomerMeasurement {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the client measurement' })
  id: string;

  @Column({ name: 'chest', type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Chest measurement in inches' })
  chest: number;

  @Column({ name: 'waist', type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Waist measurement in inches' })
  waist: number;

  @Column({ name: 'hips', type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Hips measurement in inches' })
  hips: number;

  @Column({ name: 'neck', type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Neck measurement in inches' })
  neck: number;

  @Column({ name: 'sleeve', type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Sleeve measurement in inches' })
  sleeve: number;

  @Column({ name: 'inseam', type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Inseam measurement in inches' })
  inseam: number;

  @Column({ name: 'notes', type: 'text', nullable: true, comment: 'Additional notes for the client measurement' })
  notes: string | null;

  @OneToOne(() => Customers, customer => customer.measurements, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customers;
}
