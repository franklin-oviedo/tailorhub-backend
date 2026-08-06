import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from '../entities/appointment.entity';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { Employee } from 'src/entities/employee.entity';
import { Customers } from 'src/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Customers, Employee])],
  providers: [AppointmentsService, PlanPermissionsGuard],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
