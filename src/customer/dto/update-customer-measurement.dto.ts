import { PartialType } from '@nestjs/swagger';
import { CreateCustomerMeasurementDto } from './create-customer-measurement.dto';

export class UpdateCustomerMeasurementDto extends PartialType(CreateCustomerMeasurementDto) {}
