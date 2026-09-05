import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../decorators/public/public.decorator';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
  handleRequest<TUser = JwtPayload>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: number,
  ): TUser {
    void context;
    void status;

    if (err || !user) {
      if (
        info &&
        typeof info === 'object' &&
        'name' in info &&
        info.name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException(
          'La sesión ha expirado. Por favor, inicia sesión nuevamente.',
        );
      }

      throw new UnauthorizedException(
        'No autorizado. Debes iniciar sesión para acceder a este recurso.',
      );
    }

    return user;
  }
}
