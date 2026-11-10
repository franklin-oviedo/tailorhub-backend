import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

class WomenPantsMeasurementsDto {
  @ApiPropertyOptional({ example: 72.5 }) @IsOptional() @IsNumber() cintura?: number;
  @ApiPropertyOptional({ example: 95 }) @IsOptional() @IsNumber() bacinete?: number;
  @ApiPropertyOptional({ example: 102 }) @IsOptional() @IsNumber() largoTotal?: number;
  @ApiPropertyOptional({ example: 40 }) @IsOptional() @IsNumber() anchoRodilla?: number;
  @ApiPropertyOptional({ example: 36 }) @IsOptional() @IsNumber() anchoRuedo?: number;
  @ApiPropertyOptional({ example: 28 }) @IsOptional() @IsNumber() alturaTiro?: number;
}

class ShirtMeasurementsDto {
  @ApiPropertyOptional({ example: 42 }) @IsOptional() @IsNumber() largoEspalda?: number;
  @ApiPropertyOptional({ example: 40 }) @IsOptional() @IsNumber() largoTalle?: number;
  @ApiPropertyOptional({ example: 66 }) @IsOptional() @IsNumber() largoTotal?: number;
  @ApiPropertyOptional({ example: 48 }) @IsOptional() @IsNumber() anchoPecho?: number;
  @ApiPropertyOptional({ example: 42 }) @IsOptional() @IsNumber() anchoCintura?: number;
  @ApiPropertyOptional({ example: 50 }) @IsOptional() @IsNumber() anchoBacinete?: number;
  @ApiPropertyOptional({ example: 61 }) @IsOptional() @IsNumber() largoTotalManga?: number;
  @ApiPropertyOptional({ example: 30 }) @IsOptional() @IsNumber() anchoBrazo?: number;
  @ApiPropertyOptional({ example: 20 }) @IsOptional() @IsNumber() anchoPunos?: number;
  @ApiPropertyOptional({ example: 34 }) @IsOptional() @IsNumber() frentePecho?: number;
  @ApiPropertyOptional({ example: 37 }) @IsOptional() @IsNumber() anchoCuello?: number;
  @ApiPropertyOptional({ example: 18 }) @IsOptional() @IsNumber() delantera?: number;
  @ApiPropertyOptional({ example: 20 }) @IsOptional() @IsNumber() trasera?: number;
  @ApiPropertyOptional({
    example: 20,
    description: 'Alias de trasera para compatibilidad con clientes que envían "tracera".',
  })
  @IsOptional()
  @IsNumber()
  tracera?: number;
}

class JacketMeasurementsDto {
  @ApiPropertyOptional({ example: 44 }) @IsOptional() @IsNumber() largoEspalda?: number;
  @ApiPropertyOptional({ example: 42 }) @IsOptional() @IsNumber() largoTalle?: number;
  @ApiPropertyOptional({ example: 70 }) @IsOptional() @IsNumber() largoTotal?: number;
  @ApiPropertyOptional({ example: 50 }) @IsOptional() @IsNumber() anchoPechoBusto?: number;
  @ApiPropertyOptional({ example: 44 }) @IsOptional() @IsNumber() anchoCintura?: number;
  @ApiPropertyOptional({ example: 52 }) @IsOptional() @IsNumber() anchoBacineteCadera?: number;
  @ApiPropertyOptional({ example: 63 }) @IsOptional() @IsNumber() largoTotalManga?: number;
  @ApiPropertyOptional({ example: 31 }) @IsOptional() @IsNumber() anchoManga?: number;
  @ApiPropertyOptional({ example: 24 }) @IsOptional() @IsNumber() anchoBocaManga?: number;
}

class DressMeasurementsDto {
  @ApiPropertyOptional({ example: 41 }) @IsOptional() @IsNumber() largoEspalda?: number;
  @ApiPropertyOptional({ example: 39 }) @IsOptional() @IsNumber() largoTalle?: number;
  @ApiPropertyOptional({ example: 115 }) @IsOptional() @IsNumber() largoTotal?: number;
  @ApiPropertyOptional({ example: 90 }) @IsOptional() @IsNumber() contornoBusto?: number;
  @ApiPropertyOptional({ example: 72 }) @IsOptional() @IsNumber() contornoCintura?: number;
  @ApiPropertyOptional({ example: 98 }) @IsOptional() @IsNumber() contornoCadera?: number;
  @ApiPropertyOptional({ example: 18 }) @IsOptional() @IsNumber() separacionBusto?: number;
  @ApiPropertyOptional({ example: 22 }) @IsOptional() @IsNumber() alturaCadera?: number;
  @ApiPropertyOptional({ example: 24 }) @IsOptional() @IsNumber() alturaCaderaTrasera?: number;
  @ApiPropertyOptional({ example: 26 }) @IsOptional() @IsNumber() alturaBustoPezon?: number;
  @ApiPropertyOptional({ example: 31 }) @IsOptional() @IsNumber() alturaBustoCompleto?: number;
  @ApiPropertyOptional({ example: 19 }) @IsOptional() @IsNumber() anchoSisa?: number;
}

export class CreateCustomerMeasurementDto {
  @ApiProperty({ format: 'uuid', example: 'afb0ba55-2939-4336-9c8b-e5ea3692f346' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    example: 72.5,
    description: 'Legacy field. Maps to pantsWomen.cintura',
  })
  @IsOptional()
  @IsNumber()
  waist?: number;

  @ApiPropertyOptional({
    example: 95,
    description: 'Legacy field. Maps to pantsWomen.bacinete',
  })
  @IsOptional()
  @IsNumber()
  hips?: number;

  @ApiPropertyOptional({
    example: 102,
    description: 'Legacy field. Maps to pantsWomen.largoTotal',
  })
  @IsOptional()
  @IsNumber()
  inseam?: number;

  @ApiPropertyOptional({ type: WomenPantsMeasurementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WomenPantsMeasurementsDto)
  pantsWomen?: WomenPantsMeasurementsDto;

  @ApiPropertyOptional({ type: ShirtMeasurementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShirtMeasurementsDto)
  shirts?: ShirtMeasurementsDto;

  @ApiPropertyOptional({ type: JacketMeasurementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JacketMeasurementsDto)
  jackets?: JacketMeasurementsDto;

  @ApiPropertyOptional({ type: DressMeasurementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DressMeasurementsDto)
  dresses?: DressMeasurementsDto;

  @ApiPropertyOptional({ example: 'Medidas tomadas en sesión 2.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
