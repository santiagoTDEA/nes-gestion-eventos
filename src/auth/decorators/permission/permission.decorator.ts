import { SetMetadata } from '@nestjs/common';
import { Module } from '../../constants/module.enum';
import { Action } from '../../constants/action.enum';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  module: Module;
  action: Action;
  isCatalog?: boolean;
  /** Solo roles con permisos y módulos completos; los accesos del rol no cuentan. */
  globalOnly?: boolean;
  /** Cualquier usuario autenticado, sobre su propia cuenta (el id sale del token). */
  ownAccount?: boolean;
}

export const RequirePermission = (
  module: Module,
  action: Action,
  options?: { isCatalog?: boolean; globalOnly?: boolean; ownAccount?: boolean },
) =>
  SetMetadata(PERMISSION_KEY, {
    module,
    action,
    isCatalog: options?.isCatalog ?? false,
    globalOnly: options?.globalOnly ?? false,
    ownAccount: options?.ownAccount ?? false,
  });
