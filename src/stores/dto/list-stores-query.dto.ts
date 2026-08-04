import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListStoresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by store name or email', example: 'atelier' })
  @IsOptional()
  @IsString()
  search?: string;
}
