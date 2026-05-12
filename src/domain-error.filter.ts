import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from './shared/domain/errors';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = mapCodeToHttpStatus(exception.code);
    response.status(status).json({
      code: exception.code,
      message: exception.message,
      details: exception.details,
      correlationId: request.headers['x-correlation-id'] ?? null,
    });
  }
}

function mapCodeToHttpStatus(code: string): number {
  switch (code) {
    case 'REQUEST_NOT_FOUND':
      return 404;
    case 'ILLEGAL_STATUS_TRANSITION':
    case 'INVALID_DAYS':
    case 'INVALID_DIMENSIONS':
    case 'IDEMPOTENCY_KEY_CONFLICT':
      return 400;
    case 'INSUFFICIENT_BALANCE':
      return 409;
    case 'CONFLICT':
      return 409;
    default:
      return 400;
  }
}
