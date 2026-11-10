import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcceptGoogleInvitationDto {
  @ApiProperty({ example: 'c932ebea16c2f5b0f602eb264e3ddfdf6ed2789162fc9ec9d52636c5b4fdfe14' })
  @IsString()
  invitationToken!: string;

  @ApiProperty({
    description: 'Google ID token returned by Google Identity Services.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString()
  credential!: string;

  @ApiPropertyOptional({
    example: '(809) 555-0000',
    description: 'Optional phone when creating new employee profile from invitation.',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
