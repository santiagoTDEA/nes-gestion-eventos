import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class RequestHeadersInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestHeadersInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const capturedHeaders = {
      requestId: request.header('x-request-id'),
      userAgent: request.header('user-agent'),
      origin: request.header('origin'),
    };

    this.logger.debug({
      method: request.method,
      path: request.originalUrl,
      headers: capturedHeaders,
    });

    return next.handle();
  }
}
