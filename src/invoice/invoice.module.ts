import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Order } from '../entities/order.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { CreditNote } from '../entities/credit-note.entity';
import { User } from '../entities/user.entity';
import { DebitNote } from '../entities/debit-note.entity';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { InvoiceNumberService } from './invoice-number.service';
import { FiscalDocumentService } from './fiscal-document.service';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Order, InvoicePayment, CreditNote, DebitNote, User]),
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceCalculationService,
    InvoiceNumberService,
    FiscalDocumentService,
    PlanPermissionsGuard,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
