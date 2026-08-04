import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  const createContext = (role?: Role): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  it('returns true when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext(Role.ADMIN))).toBe(true);
  });

  it('returns true when roles metadata is an empty array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(createContext(Role.ADMIN))).toBe(true);
  });

  it('returns true when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.EMPLOYEE]);

    expect(guard.canActivate(createContext(Role.EMPLOYEE))).toBe(true);
  });

  it('throws ForbiddenException when user role is not allowed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(createContext(Role.CLIENT))).toThrow(ForbiddenException);
  });
});
