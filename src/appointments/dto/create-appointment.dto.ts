import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatusEnum } from '../../enums/appointments.enum';


export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid', example: '55555555-5555-5555-5555-555555555555' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ format: 'uuid', example: '66666666-6666-6666-6666-666666666666' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-08-10T15:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @ApiPropertyOptional({ enum: AppointmentStatusEnum, default: AppointmentStatusEnum.SCHEDULED })
  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: AppointmentStatusEnum;

  @ApiPropertyOptional({ example: 'Primera prueba de traje.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
