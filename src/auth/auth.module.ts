import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../entities/user.entity';
import { Store } from '../entities/store.entity';
import { Customers } from 'src/entities/customer.entity';
import { Employee } from 'src/entities/employee.entity';
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Store, Customers, Employee]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresInSeconds = Number(
          configService.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'),
        );
        const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
        const isProduction = nodeEnv === 'production';
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret && isProduction) {
          throw new Error('JWT_SECRET must be configured in production environments.');
        }

        if (!jwtSecret && !isProduction) {
          // eslint-disable-next-line no-console
          console.warn(
            'JWT_SECRET is not set. Falling back to a development-only secret. Configure a real secret in production.',
          );
        }

        return {
          secret: jwtSecret ?? 'development-secret-change-me',
          signOptions: {
            expiresIn: Number.isNaN(expiresInSeconds) ? 86400 : expiresInSeconds,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
