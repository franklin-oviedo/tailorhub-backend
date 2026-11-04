import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Customers } from './customer.entity';

@Entity('customer_measurements')
export class CustomerMeasurement {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the client measurement' })
  id: string;

  @Column({ name: 'pants_women', type: 'jsonb', nullable: true, comment: 'Women pants measurements' })
  pantsWomen: object | null;

  @Column({ name: 'shirts', type: 'jsonb', nullable: true, comment: 'Shirt measurements' })
  shirts: object | null;

  @Column({ name: 'jackets', type: 'jsonb', nullable: true, comment: 'Jacket measurements' })
  jackets: object | null;

  @Column({ name: 'dresses', type: 'jsonb', nullable: true, comment: 'Dress measurements' })
  dresses: object | null;

  @Column({ name: 'notes', type: 'text', nullable: true, comment: 'Additional notes for the client measurement' })
  notes: string | null;

  @OneToOne(() => Customers, customer => customer.measurements, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customers;
}
