import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppointmentStatusEnum } from '../../enums/appointments.enum';

export class ListAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AppointmentStatusEnum })
  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: AppointmentStatusEnum;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Filter appointments starting from this datetime (inclusive).',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Filter appointments until this datetime (inclusive).',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
