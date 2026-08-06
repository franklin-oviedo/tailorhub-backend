import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ maxLength: 120, example: 'Atelier Central' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ maxLength: 160, example: 'contacto@atelier.com' })
  @IsEmail()
  @MaxLength(160)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ maxLength: 30, example: '(809) 123-4567' })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiPropertyOptional({ maxLength: 255, example: 'Av. Reforma 100, CDMX' })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Manager user id assigned to this store.',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Subscription plan id assigned to this store.',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
