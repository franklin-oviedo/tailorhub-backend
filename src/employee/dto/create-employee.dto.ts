import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ maxLength: 255, example: 'Ana Martinez' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ maxLength: 100, example: 'ana.martinez@tailorhub.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ maxLength: 20, example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Especialista en ajustes.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only super admin/admin can assign employees to another store.',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional user account linked to this employee.' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
