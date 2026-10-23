import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FiscalDocumentTypeEnum, InvoiceStatusEnum } from '../../enums/invoice.enum';

export class GenerateFiscalReportDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateTo: string;

  @ApiPropertyOptional({ enum: FiscalDocumentTypeEnum })
  @IsOptional()
  @IsEnum(FiscalDocumentTypeEnum)
  fiscalDocumentType?: FiscalDocumentTypeEnum;

  @ApiPropertyOptional({ enum: InvoiceStatusEnum })
  @IsOptional()
  @IsEnum(InvoiceStatusEnum)
  status?: InvoiceStatusEnum;
}
