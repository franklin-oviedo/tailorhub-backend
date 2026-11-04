import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { Customers } from '../entities/customer.entity';
import { Employee } from '../entities/employee.entity';
import { Store } from '../entities/store.entity';
import { SuperAdminProtectionService } from './super-admin-protection.service';
import { Permission } from '../entities/permission.entity';
import { Plan } from '../entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Customers, Employee, Store, Permission, Plan])],
  controllers: [UsersController],
  providers: [UsersService, PlanPermissionsGuard, SuperAdminProtectionService],
  exports: [UsersService],
})
export class UsersModule {}
