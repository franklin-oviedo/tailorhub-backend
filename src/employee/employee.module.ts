import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customers } from 'src/entities/customer.entity';
import { Employee } from 'src/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ Employee ])],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
