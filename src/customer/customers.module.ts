import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerMeasurement } from '../entities/customer-measurements.entity';
import { Customers } from '../entities/customer.entity';
import { User } from '../entities/user.entity';
import { CustomersService } from './service/customers.service';
import { CustomerMeasurementsController } from './controller/customer-measurements.controller';
import { CustomerMeasurementsService } from './service/customer-measurements.service';
import { CustomersController } from './controller/customers.controller';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerMeasurement, Customers, User])],
  controllers: [CustomerMeasurementsController, CustomersController],
  providers: [CustomerMeasurementsService, CustomersService, PlanPermissionsGuard],
})
export class CustomersModule {}
  