import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ maxLength: 120, example: 'Atelier Central' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ maxLength: 160, example: 'contacto@atelier.com' })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiPropertyOptional({ maxLength: 30, example: '+52 55 1234 5678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255, example: 'Av. Reforma 100, CDMX' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
