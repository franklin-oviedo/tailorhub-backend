import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreditNoteDto {
  @ApiProperty({ minLength: 3, maxLength: 255 })
  @IsString()
  @MaxLength(255)
  reason: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fiscalNumber?: string;

  @ApiPropertyOptional({
    type: [Object],
    description: 'Optional lightweight list of credited lines and quantities.',
  })
  @IsOptional()
  @IsArray()
  affectedItems?: Record<string, unknown>[];
}
