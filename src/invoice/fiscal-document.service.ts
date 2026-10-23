import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { FiscalDocumentTypeEnum } from '../enums/invoice.enum';

type FiscalAssignmentInput = {
  invoiceId: string;
  fiscalDocumentType?: FiscalDocumentTypeEnum;
  fiscalNumber?: string;
};

@Injectable()
export class FiscalDocumentService {
  async assignFiscalDocument(
    manager: EntityManager,
    input: FiscalAssignmentInput,
  ): Promise<{ fiscalDocumentType: FiscalDocumentTypeEnum | null; fiscalNumber: string | null }> {
    if (input.fiscalDocumentType && this.requiresFiscalNumber(input.fiscalDocumentType) && !input.fiscalNumber) {
      throw new BadRequestException('Fiscal number is required for this fiscal document type.');
    }

    if (input.fiscalNumber && !input.fiscalDocumentType) {
      throw new BadRequestException(
        'Fiscal document type is required when fiscal number is provided.',
      );
    }

    if (!input.fiscalNumber) {
      return {
        fiscalDocumentType: input.fiscalDocumentType ?? null,
        fiscalNumber: null,
      };
    }

    const existing = await manager.getRepository(Invoice).findOne({
      where: { fiscalNumber: input.fiscalNumber },
      select: { id: true },
    });

    if (existing && existing.id !== input.invoiceId) {
      throw new BadRequestException('Fiscal number already exists.');
    }

    return {
      fiscalDocumentType: input.fiscalDocumentType ?? null,
      fiscalNumber: input.fiscalNumber,
    };
  }

  private requiresFiscalNumber(fiscalDocumentType: FiscalDocumentTypeEnum): boolean {
    return fiscalDocumentType !== FiscalDocumentTypeEnum.CONSUMER;
  }
}
