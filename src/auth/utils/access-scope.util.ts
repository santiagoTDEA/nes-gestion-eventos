import { Action } from '../constants/action.enum';
import { AuthUser, JwtRolePayload } from '../interfaces/jwt-payload.interface';

/** Administrador / super administrador: rol con permisos y módulos completos. */
export function hasGlobalAccess(role?: JwtRolePayload): boolean {
  return !!role?.permissionsFull && !!role?.modulesFull;
}

/**
 * Alcance de datos del usuario para recursos con dueño.
 * - `undefined`: acceso global, ve y gestiona todos los registros.
 * - `string`: id del usuario (claim `sub` del token); solo ve y gestiona los suyos.
 */
export function getOwnerScope(user: AuthUser): string | undefined {
  return hasGlobalAccess(user.role) ? undefined : user.userId;
}

/**
 * Acciones efectivas a partir de las guardadas en el rol. Es jerárquico:
 *   crear  -> todo el CRUD (crear, editar, eliminar, ver)
 *   editar -> editar y ver
 *   leer / ver -> ver
 * `leer` es el nombre con el que la pantalla de roles guarda `ver`.
 */
export function expandActions(acciones: string[] = []): Set<string> {
  const efectivas = new Set(acciones);

  if (efectivas.has(Action.CREAR)) {
    efectivas.add(Action.EDITAR);
    efectivas.add(Action.ELIMINAR);
  }

  if (efectivas.has(Action.EDITAR) || efectivas.has('leer')) {
    efectivas.add(Action.VER);
  }

  if (efectivas.has(Action.VER)) {
    efectivas.add('leer');
  }

  return efectivas;
}
