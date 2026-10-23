import { ApiProperty } from '@nestjs/swagger';
import { DiscountTypeEnum, FiscalDocumentTypeEnum, InvoiceStatusEnum } from '../../enums/invoice.enum';

export class InvoiceDocumentCompanyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  address: string;
}

export class InvoiceDocumentItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  orderItemId: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty({ enum: DiscountTypeEnum, nullable: true })
  discountType: DiscountTypeEnum | null;

  @ApiProperty()
  discountValue: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  taxableBase: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  lineTotal: number;
}

export class InvoiceDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  invoiceNumber: string | null;

  @ApiProperty({ nullable: true })
  fiscalNumber: string | null;

  @ApiProperty({ enum: FiscalDocumentTypeEnum, nullable: true })
  fiscalDocumentType: FiscalDocumentTypeEnum | null;

  @ApiProperty({ enum: InvoiceStatusEnum })
  status: InvoiceStatusEnum;

  @ApiProperty({ type: InvoiceDocumentCompanyDto })
  company: InvoiceDocumentCompanyDto;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  taxableAmount: number;

  @ApiProperty()
  exemptAmount: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  amountPaid: number;

  @ApiProperty()
  balance: number;

  @ApiProperty({ nullable: true })
  issuedAt: Date | null;

  @ApiProperty({ nullable: true })
  dueAt: Date | null;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty({ nullable: true })
  termsAndConditions: string | null;

  @ApiProperty()
  customerSnapshot: Record<string, unknown>;

  @ApiProperty()
  orderSnapshot: Record<string, unknown>;

  @ApiProperty({ type: [InvoiceDocumentItemDto] })
  items: InvoiceDocumentItemDto[];

  @ApiProperty({ type: [Object] })
  payments: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  creditNotes: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  debitNotes: Record<string, unknown>[];
}
