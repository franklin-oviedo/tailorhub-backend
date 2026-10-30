import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /* c8 ignore next */
  constructor(configService: ConfigService) {
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

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret ?? 'development-secret-change-me',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload?.sub || !payload?.storeId || !payload?.role) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return payload;
  }
}
