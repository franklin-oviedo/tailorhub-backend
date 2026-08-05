import { SetMetadata } from '@nestjs/common';
import { ModulePermission } from '../enums/module-permission.enum';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: ModulePermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
