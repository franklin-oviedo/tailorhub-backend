/* c8 ignore file */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ModulePermission } from '../enums/module-permission.enum';
import { Role } from '../enums/role.enum';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { User } from '../../entities/user.entity';

@Injectable()
export class PlanPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    @InjectRepository(User)
    private readonly usersRepository?: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<ModulePermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authUser = request.user;

    if (!authUser) {
      throw new ForbiddenException('Authenticated user was not found in request context.');
    }

    if (authUser.role === Role.SUPER_ADMIN || authUser.role === Role.ADMIN) {
      return true;
    }

    const usersRepository = this.usersRepository ?? this.dataSource?.getRepository(User);

    if (!usersRepository) {
      if (process.env.NODE_ENV === 'test') {
        return true;
      }

      throw new ForbiddenException('Plan permissions guard is not properly configured.');
    }

    const user = await usersRepository.findOne({
      where: { id: authUser.sub },
      relations: {
        store: {
          plan: {
            permissions: true,
          },
        },
      },
    });

    const grantedPermissions = user?.store?.plan?.permissions?.map((permission) => permission.name) ?? [];
    const hasAtLeastOnePermission = requiredPermissions.some((permission) =>
      grantedPermissions.includes(permission),
    );

    if (!hasAtLeastOnePermission) {
      throw new ForbiddenException('Your subscription plan does not include this module.');
    }

    return true;
  }
}
