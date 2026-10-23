import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ maxLength: 255, example: 'Ana Martinez' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ maxLength: 255, example: 'ana.martinez@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ maxLength: 20, example: '+57 300 123 4567' })
  @IsString()
  @MaxLength(20)
  phone!: string;
}
