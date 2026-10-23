import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountTypeEnum } from '../../enums/invoice.enum';

export class UpdateInvoiceDraftItemDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DiscountTypeEnum })
  @IsOptional()
  @IsEnum(DiscountTypeEnum)
  discountType?: DiscountTypeEnum;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class UpdateInvoiceDraftDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 3, example: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({ enum: DiscountTypeEnum })
  @IsOptional()
  @IsEnum(DiscountTypeEnum)
  discountType?: DiscountTypeEnum;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ type: [UpdateInvoiceDraftItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceDraftItemDto)
  items?: UpdateInvoiceDraftItemDto[];
}
