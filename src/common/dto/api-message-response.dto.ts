import { ApiProperty } from '@nestjs/swagger';

export class ApiMessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully.' })
  message!: string;
}
