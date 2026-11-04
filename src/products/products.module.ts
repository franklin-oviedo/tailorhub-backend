import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { ServicesService } from './products.service';
import { ServicesController } from './products.controller';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product, User])],
  providers: [ServicesService, PlanPermissionsGuard],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
