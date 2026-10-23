import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ maxLength: 255, example: 'Ana Maria Martinez' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ maxLength: 255, example: 'ana.maria@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 20, example: '+57 301 987 6543' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
