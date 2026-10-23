import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoiceNumberService {
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    this.prefix = this.configService.get<string>('BILLING_INVOICE_PREFIX', 'INV');
  }

  async getNextInvoiceNumber(
    manager: EntityManager,
  ): Promise<{ invoiceSequence: number; invoiceNumber: string }> {
    const lastInvoice = await manager
      .getRepository(Invoice)
      .createQueryBuilder('invoice')
      .where('invoice.invoiceSequence IS NOT NULL')
      .orderBy('invoice.invoiceSequence', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    const current = Number(lastInvoice?.invoiceSequence ?? 0);
    const next = current + 1;

    return {
      invoiceSequence: next,
      invoiceNumber: `${this.prefix}-${next.toString().padStart(8, '0')}`,
    };
  }
}
