import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../shared/domain/errors';

enum DomainErrorCode {
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  ILLEGAL_STATUS_TRANSITION = 'ILLEGAL_STATUS_TRANSITION',
  INVALID_DAYS = 'INVALID_DAYS',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  IDEMPOTENCY_KEY_CONFLICT = 'IDEMPOTENCY_KEY_CONFLICT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CONFLICT = 'CONFLICT',
}

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
    case DomainErrorCode.REQUEST_NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case DomainErrorCode.ILLEGAL_STATUS_TRANSITION:
    case DomainErrorCode.INVALID_DAYS:
    case DomainErrorCode.INVALID_DIMENSIONS:
    case DomainErrorCode.IDEMPOTENCY_KEY_CONFLICT:
      return HttpStatus.BAD_REQUEST;
    case DomainErrorCode.INSUFFICIENT_BALANCE:
      return HttpStatus.CONFLICT;
    case DomainErrorCode.CONFLICT:
      return HttpStatus.CONFLICT;
    default:
      return HttpStatus.BAD_REQUEST;
  }
}
