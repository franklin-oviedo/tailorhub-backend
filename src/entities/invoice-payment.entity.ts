import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethodEnum } from '../enums/invoice.enum';
import { Invoice } from './invoice.entity';

@Entity('invoice_payments')
@Check('CHK_invoice_payments_amount_positive', '"amount" > 0')
export class InvoicePayment {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for invoice payment' })
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.OTHER,
  })
  paymentMethod: PaymentMethodEnum;

  @Column({ name: 'reference', type: 'varchar', length: 120, nullable: true })
  reference: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'paid_at', type: 'timestamp' })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
