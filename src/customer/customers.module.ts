import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerMeasurement } from 'src/entities/customer-measurements.entity';
import { Customers } from 'src/entities/customer.entity';
import { CustomersService } from './service/customers.service';
import { CustomerMeasurementsController } from './controller/customer-measurements.controller';
import { CustomerMeasurementsService } from './service/customer-measurements.service';
import { CustomersController } from './controller/customers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerMeasurement, Customers])],
  controllers: [CustomerMeasurementsController, CustomersController],
  providers: [CustomerMeasurementsService, CustomersService],
})
export class CustomersModule {}
  