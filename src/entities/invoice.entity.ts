import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { Order } from './order.entity';
import { Customers } from './customer.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  invoiceNumber: string; // Número de factura único

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => Customers, customer => customer.invoices)
  customer: Customers;

  @ManyToOne(() => Store, store => store.invoices)
  store: Store;

  @ManyToOne(() => Order, order => order.invoice, { nullable: true })
  order: Order;

  @OneToMany(() => User, user => user.id)
  users: User[];

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 20 })
  status: string; // Ejemplo: "pendiente", "pagado", "cancelado"

  @Column({ type: 'text', nullable: true })
  notes: string;
}
