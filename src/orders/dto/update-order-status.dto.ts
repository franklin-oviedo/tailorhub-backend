import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatusEnum } from '../../enums/order.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatusEnum, example: OrderStatusEnum.IN_PROGRESS })
  @IsEnum(OrderStatusEnum)
  status!: OrderStatusEnum;

  @ApiPropertyOptional({ example: 'Cliente confirmado por telefono.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
