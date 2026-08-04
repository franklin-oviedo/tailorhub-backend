import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ maxLength: 120, example: 'Traje Ejecutivo Azul' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Traje de lana premium con ajuste slim fit.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ minimum: 0, example: 199.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ default: true, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
