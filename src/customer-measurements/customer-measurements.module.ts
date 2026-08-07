import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerMeasurementsService } from './customer-measurements.service';
import { CustomerMeasurementsController } from './customer-measurements.controller';
import { CustomerMeasurement } from 'src/entities/customer-measurements.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerMeasurement])],
  controllers: [CustomerMeasurementsController],
  providers: [CustomerMeasurementsService],
})
export class CustomerMeasurementsModule {}
