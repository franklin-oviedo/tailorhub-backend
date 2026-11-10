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
import { UserInvitation } from '../entities/user-invitation.entity';
import { UserInvitationService } from './user-invitation.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Customers, Employee, Store, Permission, Plan, UserInvitation])],
  controllers: [UsersController],
  providers: [UsersService, PlanPermissionsGuard, SuperAdminProtectionService, UserInvitationService],
  exports: [UsersService, UserInvitationService],
})
export class UsersModule {}
