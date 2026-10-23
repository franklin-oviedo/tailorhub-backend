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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountTypeEnum } from '../../enums/invoice.enum';

export class CreateInvoiceFromOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderItemId: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ enum: DiscountTypeEnum })
  @IsOptional()
  @IsEnum(DiscountTypeEnum)
  discountType?: DiscountTypeEnum;

  @ApiPropertyOptional({ minimum: 0, description: 'Percentage or fixed amount according to discountType.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Tax rate percentage.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class CreateInvoiceFromOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId: string;

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

  @ApiPropertyOptional({ minimum: 0, description: 'Percentage or fixed amount according to discountType.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ type: [CreateInvoiceFromOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceFromOrderItemDto)
  items?: CreateInvoiceFromOrderItemDto[];
}
