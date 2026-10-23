import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('debit_notes')
@Check('CHK_debit_notes_amount_positive', '"amount" > 0')
export class DebitNote {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for debit note' })
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.debitNotes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'reason', type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'fiscal_number', type: 'varchar', length: 30, nullable: true })
  fiscalNumber: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
