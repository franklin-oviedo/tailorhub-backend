import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../common/enums/role.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  it('returns payload for valid token payload', () => {
    const strategy = new JwtStrategy(configService);
    const payload = { sub: 'u1', email: 'u@test.com', role: Role.ADMIN, storeId: 's1' };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('throws UnauthorizedException for invalid payload', () => {
    const strategy = new JwtStrategy(configService);

    expect(() =>
      strategy.validate({ sub: '', email: 'u@test.com', role: Role.ADMIN, storeId: 's1' } as any),
    ).toThrow(UnauthorizedException);
  });

});
