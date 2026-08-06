import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/common/enums/role.enum';

export class LoginDto {
  @ApiProperty({ example: 'gerente@elegance.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'TailorHub123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
