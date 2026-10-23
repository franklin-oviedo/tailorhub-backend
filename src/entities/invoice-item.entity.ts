import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DiscountTypeEnum } from '../enums/invoice.enum';
import { Invoice } from './invoice.entity';
import { OrderItem } from './order-item.entity';

@Entity('invoice_items')
@Check('CHK_invoice_items_quantity_positive', '"quantity" > 0')
@Check('CHK_invoice_items_unit_price_non_negative', '"unit_price" >= 0')
@Check('CHK_invoice_items_discount_amount_non_negative', '"discount_amount" >= 0')
@Check('CHK_invoice_items_tax_amount_non_negative', '"tax_amount" >= 0')
@Check('CHK_invoice_items_line_total_non_negative', '"line_total" >= 0')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for invoice item' })
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => OrderItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem | null;

  @Column({ name: 'description', type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ name: 'discount_type', type: 'enum', enum: DiscountTypeEnum, nullable: true })
  discountType: DiscountTypeEnum | null;

  @Column({ name: 'discount_value', type: 'numeric', precision: 12, scale: 4, default: 0 })
  discountValue: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'taxable_base', type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxableBase: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 6, scale: 3, default: 0 })
  taxRate: number;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 12, scale: 2, default: 0 })
  lineTotal: number;

  @Column({ name: 'is_taxable', type: 'boolean', default: true })
  isTaxable: boolean;

  @Column({ name: 'snapshot', type: 'jsonb', nullable: true })
  snapshot: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
