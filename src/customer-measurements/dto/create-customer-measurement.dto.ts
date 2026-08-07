import { IsNumber, IsUUID, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCustomerMeasurementDto {
    @ApiProperty({ format: 'uuid', example: 'afb0ba55-2939-4336-9c8b-e5ea3692f346', description: 'The ID of the customer.' })
    @IsUUID()
    customerId: string;

    @ApiProperty({ example: 36, description: 'The chest measurement of the customer.' })
    @IsNumber()
    chest: number;

    @ApiProperty({ example: 32, description: 'The waist measurement of the customer.' })
    @IsNumber()
    waist: number;

    @ApiProperty({ example: 40, description: 'The hips measurement of the customer.' })
    @IsNumber()
    hips: number;

    @ApiProperty({ example: 15, description: 'The neck measurement of the customer.' })
    @IsNumber()
    neck: number;

    @ApiProperty({ example: 34, description: 'The sleeve measurement of the customer.' })
    @IsNumber()
    sleeve: number;

    @ApiProperty({ example: 32, description: 'The inseam measurement of the customer.' })
    @IsNumber()
    inseam: number;

    @ApiProperty({ example: 'Customer prefers slim fit.', description: 'Additional notes about the customer measurement.' })
    @IsString()
    notes: string;
}
