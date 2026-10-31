import { describe, it, expect } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionGuard } from './permission.guard';
import {
  PERMISSION_KEY,
  PermissionMetadata,
} from '../../decorators/permission/permission.decorator';
import { Action } from '../../constants/action.enum';
import { Module } from '../../constants/module.enum';

/** Contexto de una petición con el permiso del endpoint y el usuario del token. */
function context(
  permission: PermissionMetadata,
  user: unknown,
): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(PERMISSION_KEY, permission, handler);

  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const noAccessUser = {
  userId: 'user-1',
  role: { id: 'r1', name: 'Docente', accesos: [] },
};

describe('PermissionGuard · ownAccount', () => {
  const guard = new PermissionGuard(new Reflector());

  it('deja pasar a cualquier usuario autenticado en acciones sobre su cuenta', () => {
    const permission = {
      module: Module.USUARIOS,
      action: Action.EDITAR,
      ownAccount: true,
    };
    expect(guard.canActivate(context(permission, noAccessUser))).toBe(true);
  });

  it('sin ownAccount, el mismo usuario no puede editar usuarios', () => {
    const permission = { module: Module.USUARIOS, action: Action.EDITAR };
    expect(() => guard.canActivate(context(permission, noAccessUser))).toThrow(
      ForbiddenException,
    );
  });

  it('ownAccount sigue exigiendo un usuario autenticado', () => {
    const permission = {
      module: Module.USUARIOS,
      action: Action.EDITAR,
      ownAccount: true,
    };
    expect(() => guard.canActivate(context(permission, undefined))).toThrow(
      ForbiddenException,
    );
  });
});
