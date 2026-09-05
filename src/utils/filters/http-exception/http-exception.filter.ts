import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorManager } from '../../error.manager';

@Catch()
export class HttpExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ha ocurrido un error interno del servidor.';

    if (exception instanceof ErrorManager) {
      const errorManager = exception as ErrorManager & { type?: string };
      status = this.getStatusCode(
        errorManager.type ?? errorManager.message.split(' :: ')[0],
      );
      message = exception.message;
    }

    else if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseMessage = (exceptionResponse as {
          message?: string | string[];
        }).message;

        if (Array.isArray(responseMessage)) {
          message = responseMessage.join(', ');
        } else if (responseMessage) {
          message = responseMessage;
        }
      }
    }

    else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getStatusCode(type: string): number {
    const statusCodes: Record<string, number> = {
      BAD_REQUEST: HttpStatus.BAD_REQUEST,
      UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
      FORBIDDEN: HttpStatus.FORBIDDEN,
      NOT_FOUND: HttpStatus.NOT_FOUND,
      CONFLICT: HttpStatus.CONFLICT,
      UNPROCESSABLE_ENTITY: HttpStatus.UNPROCESSABLE_ENTITY,
      INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    return (
      statusCodes[type] ??
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}