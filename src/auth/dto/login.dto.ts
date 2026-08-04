import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'ana@tailorhub.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'MyS3curePass!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
