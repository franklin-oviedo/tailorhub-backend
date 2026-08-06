import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Perez' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'ana@tailorhub.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '(809) 123-4567' })
  @IsString()
  phone!: string;

  @ApiProperty({ minLength: 8, example: 'MyS3curePass!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ format: 'uuid', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CLIENT, description: 'Defaults to client.' })
  @IsOptional()
  @IsEnum(Role)
  role: Role;
}
