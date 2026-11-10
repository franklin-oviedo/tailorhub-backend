import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateUserInvitationDto {
  @ApiProperty({ example: 'employee@tailorhub.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Invitation expiration in hours. Defaults to 72.',
    example: 72,
    minimum: 1,
    maximum: 720,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}
