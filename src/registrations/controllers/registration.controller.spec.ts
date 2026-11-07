import { describe, it, expect, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Module } from '../../auth/constants/module.enum';
import {
  PERMISSION_KEY,
  PermissionMetadata,
} from '../../auth/decorators/permission/permission.decorator';
import { PermissionGuard } from '../../auth/guards/permission/permission.guard';
import { RegistrationController } from './registration.controller';

// @nestjs/typeorm se publica como ESM y Jest no lo transforma; aquí solo se usa su decorador.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

const HANDLERS = [
  'findEvents',
  'template',
  'findByEvent',
  'register',
  'import',
  'remove',
] as const;

/** El método del controlador, solo para leer sus metadatos (nunca se invoca). */
function handlerOf(handler: (typeof HANDLERS)[number]): object {
  return Object.getOwnPropertyDescriptor(
    RegistrationController.prototype,
    handler,
  )?.value as object;
}

function contextFor(
  handler: (typeof HANDLERS)[number],
  role: object,
): ExecutionContext {
  return {
    getHandler: () => handlerOf(handler),
    getClass: () => RegistrationController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('RegistrationController (permisos)', () => {
  const guard = new PermissionGuard(new Reflector());

  it.each(HANDLERS)(
    '%s está reservado al módulo de asistencia con acceso total',
    (handler) => {
      const metadata = Reflect.getMetadata(
        PERMISSION_KEY,
        handlerOf(handler),
      ) as PermissionMetadata;

      expect(metadata).toMatchObject({
        module: Module.ASISTENCIA,
        globalOnly: true,
      });
    },
  );

  it.each(HANDLERS)(
    '%s deja pasar a un rol con permisos y módulos completos',
    (handler) => {
      expect(
        guard.canActivate(
          contextFor(handler, { permissionsFull: true, modulesFull: true }),
        ),
      ).toBe(true);
    },
  );

  it.each(HANDLERS)(
    '%s rechaza a un rol que tiene el módulo pero no acceso total',
    (handler) => {
      const role = {
        permissionsFull: true,
        modulesFull: false,
        accesos: [{ modulo: 'asistencia', acciones: ['crear'] }],
      };

      expect(() => guard.canActivate(contextFor(handler, role))).toThrow(
        ForbiddenException,
      );
    },
  );
});
