import { ApiProperty } from '@nestjs/swagger';

export class AccessTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token. Use it in Authorization: Bearer <token>.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InVAZXhhbXBsZS5jb20ifQ.signature',
  })
  accessToken!: string;
}
