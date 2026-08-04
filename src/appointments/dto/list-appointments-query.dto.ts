import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppointmentStatus } from '../../entities/appointment.entity';

export class ListAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

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
