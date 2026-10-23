import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FiscalDocumentTypeEnum } from '../../enums/invoice.enum';

export class IssueInvoiceDto {
  @ApiPropertyOptional({ enum: FiscalDocumentTypeEnum })
  @IsOptional()
  @IsEnum(FiscalDocumentTypeEnum)
  fiscalDocumentType?: FiscalDocumentTypeEnum;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fiscalNumber?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
