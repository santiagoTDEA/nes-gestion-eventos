import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../decorators/public/public.decorator';
import {
  PERMISSION_KEY,
  PermissionMetadata,
} from '../../decorators/permission/permission.decorator';
import { Action } from '../../constants/action.enum';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const permission = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) {
      throw new ForbiddenException(
        'El endpoint no tiene configurado un permiso.',
      );
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No se encontró el usuario autenticado.');
    }

    const role = user.role;

    if (!role) {
      throw new ForbiddenException('El usuario no tiene un rol asignado.');
    }

    if (
      (role.permissionsFull && role.modulesFull) ||
      ['admin', 'administrador'].includes(
        String(role.name ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim(),
      )
    ) {
      return true;
    }

    const requirements =
      permission.anyOf ??
      (permission.module && permission.action
        ? [{ module: permission.module, action: permission.action }]
        : []);
    const permitted = requirements.some((requirement) => {
      if (permission.isCatalog && requirement.action === Action.VER) {
        return true;
      }

      if (role.permissionsFull) {
        return true;
      }

      const acceso = role.accesos?.find(
        (item: { module?: string; modulo?: string; acciones: string[] }) =>
          (item.module ?? item.modulo) === requirement.module,
      );
      if (!acceso) {
        return false;
      }

      const actionAliases =
        requirement.action === Action.VER
          ? [Action.VER, 'leer']
          : [requirement.action];
      return actionAliases.some((action) => acceso.acciones?.includes(action));
    });

    if (!permitted) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción.',
      );
    }

    return true;
  }
}
