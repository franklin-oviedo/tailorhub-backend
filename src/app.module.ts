import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { Store } from './entities/store.entity';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Appointment } from './entities/appointment.entity';
import { Plan } from './entities/plan.entity';
import { Permission } from './entities/permission.entity';
import { PlansModule } from './plans/plans.module';
import { PermissionsModule } from './permissions/permissions.module';
import { Customers } from './entities/customer.entity';
import { CustomerMeasurement } from './entities/customer-measurements.entity';
import { Employee } from './entities/employee.entity';
import { CustomersModule } from './customer/customers.module';
import { EmployeeModule } from './employee/employee.module';
import { InvoiceModule } from './invoice/invoice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const shouldSynchronize =
          configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true';

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [
              Store,
              User,
              Product,
              Order,
              OrderItem,
              Appointment,
              Plan,
              Permission,
              Customers,
              CustomerMeasurement,
              Employee
            ],
            synchronize: shouldSynchronize,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: Number(configService.get<string>('DB_PORT', '5432')),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'tailorhub'),
          entities: [
            Store,
            User,
            Product,
            Order,
            OrderItem,
            Appointment,
            Plan,
            Permission,
            Customers,
            CustomerMeasurement,
            Employee
          ],
          synchronize: true,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    AuthModule,
    UsersModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    AppointmentsModule,
    PlansModule,
    PermissionsModule,
    CustomersModule,
    EmployeeModule,
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
