import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatusEnum } from '../../enums/appointments.enum';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ format: 'uuid', example: '55555555-5555-5555-5555-555555555555' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid', example: '66666666-6666-6666-6666-666666666666' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-08-10T15:30:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({ enum: AppointmentStatusEnum, example: AppointmentStatusEnum.CONFIRMED })
  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: AppointmentStatusEnum;

  @ApiPropertyOptional({ example: 'Cliente confirmado para ajuste final.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
