import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../decorators/public/public.decorator';
import {
  PERMISSION_KEY,
  PermissionMetadata,
} from '../../decorators/permission/permission.decorator';

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

    if (role.permissionsFull && role.modulesFull) {
      return true;
    }

    const acceso = role.accesos?.find(
      (acceso: { module: string; acciones: string[] }) =>
        acceso.module === permission.module,
    );

    if (!acceso) {
      throw new ForbiddenException(
        `No tienes acceso al módulo "${permission.module}".`,
      );
    }

    if (role.permissionsFull) {
      return true;
    }

    /**
     * 8. Verificar acción específica
     */
    const tieneAccion = acceso.acciones?.includes(permission.action);

    if (!tieneAccion) {
      throw new ForbiddenException(
        `No tienes permiso para realizar la acción "${permission.action}" en el módulo "${permission.module}".`,
      );
    }

    return true;
  }
}
