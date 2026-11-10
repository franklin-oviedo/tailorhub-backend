import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../entities/employee.entity';
import { User } from '../entities/user.entity';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User]), UsersModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, PlanPermissionsGuard],
})
export class EmployeeModule {}
