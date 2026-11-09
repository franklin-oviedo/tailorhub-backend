import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from '../entities/appointment.entity';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { Employee } from 'src/entities/employee.entity';
import { Customers } from 'src/entities/customer.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Customers, Employee, User]), AuthModule],
  providers: [AppointmentsService, PlanPermissionsGuard],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
