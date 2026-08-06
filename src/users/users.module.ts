import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { Customers } from 'src/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Customers])],
  controllers: [UsersController],
  providers: [UsersService, PlanPermissionsGuard],
  exports: [UsersService],
})
export class UsersModule {}
