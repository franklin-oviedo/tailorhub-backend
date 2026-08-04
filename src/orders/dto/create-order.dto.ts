import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid', example: '22222222-2222-2222-2222-222222222222' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1, example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ format: 'uuid', example: '33333333-3333-3333-3333-333333333333' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '44444444-4444-4444-4444-444444444444',
    description: 'Assigned employee id',
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({
    type: [CreateOrderItemDto],
    minItems: 1,
    example: [{ productId: '22222222-2222-2222-2222-222222222222', quantity: 2 }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'Entrega para el viernes en la tarde.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
