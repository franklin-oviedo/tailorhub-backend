import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto {
  @ApiPropertyOptional({ maxLength: 120, example: 'Atelier Central Norte' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ maxLength: 160, example: 'admin@atelier.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ maxLength: 30, example: '+52 55 9999 1111' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255, example: 'Calle 123, Guadalajara' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    maxLength: 1024,
    example: 'https://cdn.example.com/logos/atelier-central.png',
    description: 'URL or relative path to the company logo image.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  logo?: string;

  @ApiPropertyOptional({
    maxLength: 1024,
    example: 'https://cdn.example.com/seals/atelier-central-seal.png',
    description: 'URL or relative path to the company seal image used on invoices.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  seal?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
