import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Ana Maria Perez', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @ApiProperty({ example: 'ana.perez@tailorhub.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+57 300 123 4567', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ minLength: 8, example: 'An0therPass!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CLIENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only super admin/admin can create users in another store.',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
