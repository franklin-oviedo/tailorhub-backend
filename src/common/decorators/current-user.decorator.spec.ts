import { ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser decorator', () => {
  it('creates a decorator function', () => {
    const user = { sub: 'u1', email: 'u@test.com', role: Role.ADMIN, storeId: 's1' };

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;

    const result = (CurrentUser as unknown as (d: unknown, c: ExecutionContext) => unknown)(
      undefined,
      ctx,
    );

    expect(typeof result).toBe('function');
  });
});
