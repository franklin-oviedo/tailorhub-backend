import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../entities/appointment.entity';

@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
class IsEndDateAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: Date, args: ValidationArguments): boolean {
    const obj = args.object as CreateAppointmentDto;
    return endDate > obj.startsAt;
  }

  defaultMessage(): string {
    return 'endsAt must be later than startsAt';
  }
}

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid', example: '55555555-5555-5555-5555-555555555555' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ format: 'uuid', example: '66666666-6666-6666-6666-666666666666' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-08-10T15:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-08-10T16:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @Validate(IsEndDateAfterStartDate)
  endsAt!: Date;

  @ApiPropertyOptional({ enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: 'Primera prueba de traje.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
