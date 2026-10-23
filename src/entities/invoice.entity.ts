import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { Order } from './order.entity';
import { Customers } from './customer.entity';
import {
  DiscountTypeEnum,
  FiscalDocumentTypeEnum,
  InvoiceStatusEnum,
} from '../enums/invoice.enum';
import { InvoiceItem } from './invoice-item.entity';
import { InvoicePayment } from './invoice-payment.entity';
import { CreditNote } from './credit-note.entity';
import { DebitNote } from './debit-note.entity';

@Entity('invoices')
@Unique('UQ_invoices_invoice_number', ['invoiceNumber'])
@Unique('UQ_invoices_invoice_sequence', ['invoiceSequence'])
@Unique('UQ_invoices_fiscal_number', ['fiscalNumber'])
@Check('CHK_invoices_subtotal_non_negative', '"subtotal" >= 0')
@Check('CHK_invoices_discount_non_negative', '"discount_amount" >= 0')
@Check('CHK_invoices_tax_non_negative', '"tax_amount" >= 0')
@Check('CHK_invoices_total_non_negative', '"total" >= 0')
@Check('CHK_invoices_amount_paid_non_negative', '"amount_paid" >= 0')
@Check('CHK_invoices_balance_non_negative', '"balance" >= 0')
export class Invoice {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the invoice' })
  id: string;

  @Index('IDX_invoices_sequence')
  @Column({ name: 'invoice_sequence', type: 'int', nullable: true })
  invoiceSequence: number | null;

  @Index('IDX_invoices_number')
  @Column({ name: 'invoice_number', type: 'varchar', length: 30, nullable: true })
  invoiceNumber: string | null;

  @Index('IDX_invoices_fiscal_number')
  @Column({ name: 'fiscal_number', type: 'varchar', length: 30, nullable: true })
  fiscalNumber: string | null;

  @Column({
    name: 'fiscal_document_type',
    type: 'enum',
    enum: FiscalDocumentTypeEnum,
    nullable: true,
  })
  fiscalDocumentType: FiscalDocumentTypeEnum | null;

  @Index('IDX_invoices_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: InvoiceStatusEnum,
    default: InvoiceStatusEnum.DRAFT,
  })
  status: InvoiceStatusEnum;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'DOP' })
  currency: string;

  @Column({ name: 'subtotal', type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'discount_type', type: 'enum', enum: DiscountTypeEnum, nullable: true })
  discountType: DiscountTypeEnum | null;

  @Column({ name: 'discount_value', type: 'numeric', precision: 12, scale: 4, default: 0 })
  discountValue: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxableAmount: number;

  @Column({ name: 'exempt_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  exemptAmount: number;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total', type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'amount_paid', type: 'numeric', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ name: 'balance', type: 'numeric', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'issued_at', type: 'timestamp', nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'due_at', type: 'timestamp', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'customer_snapshot', type: 'jsonb', nullable: false })
  customerSnapshot: Record<string, unknown>;

  @Column({ name: 'order_snapshot', type: 'jsonb', nullable: false })
  orderSnapshot: Record<string, unknown>;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Customers, (customer) => customer.invoices, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customers;

  @ManyToOne(() => Store, (store) => store.invoices, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Order, (order) => order.invoices, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @OneToMany(() => InvoicePayment, (payment) => payment.invoice)
  payments: InvoicePayment[];

  @OneToMany(() => CreditNote, (creditNote) => creditNote.invoice)
  creditNotes: CreditNote[];

  @OneToMany(() => DebitNote, (debitNote) => debitNote.invoice)
  debitNotes: DebitNote[];
}
