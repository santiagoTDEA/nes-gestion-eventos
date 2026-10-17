import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../interfaces/jwt-payload.interface';

/** Devuelve el usuario autenticado (el que armó JwtStrategy.validate a partir del token). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest().user,
);
