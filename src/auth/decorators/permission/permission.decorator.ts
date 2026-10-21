import { SetMetadata } from '@nestjs/common';
import { Module } from '../../constants/module.enum';
import { Action } from '../../constants/action.enum';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  module?: Module;
  action?: Action;
  isCatalog?: boolean;
  anyOf?: Array<{ module: Module; action: Action }>;
}

export const RequirePermission = (
  module: Module,
  action: Action,
  options?: { isCatalog?: boolean },
) =>
  SetMetadata(PERMISSION_KEY, {
    module,
    action,
    isCatalog: options?.isCatalog ?? false,
  });

export const RequireAnyPermission = (
  ...permissions: Array<{ module: Module; action: Action }>
) => SetMetadata(PERMISSION_KEY, { anyOf: permissions });
