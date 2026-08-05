import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product, User])],
  providers: [ProductsService, PlanPermissionsGuard],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
