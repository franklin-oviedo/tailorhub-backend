import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID token returned by Google Identity Services.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString()
  credential!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Optional store to attach to the user when creating a new account.',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    example: '(809) 123-4567',
    description: 'Optional phone number to store when Google profile does not include it.',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
