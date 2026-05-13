import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../modules/observability/services/app-logger.service';
import { RequestContext } from '../modules/observability/request-context';
import { DomainError } from '../shared/domain/errors';

export enum DomainErrorCode {
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  ILLEGAL_STATUS_TRANSITION = 'ILLEGAL_STATUS_TRANSITION',
  INVALID_DAYS = 'INVALID_DAYS',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  IDEMPOTENCY_KEY_CONFLICT = 'IDEMPOTENCY_KEY_CONFLICT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CONFLICT = 'CONFLICT',
  HCM_UNAVAILABLE = 'HCM_UNAVAILABLE',
}

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  constructor(private readonly appLogger: AppLogger) {}

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const trace = RequestContext.get();
    const correlationId =
      trace?.correlationId ??
      (typeof request.headers['x-correlation-id'] === 'string'
        ? request.headers['x-correlation-id']
        : null);
    const requestId = trace?.requestId ?? null;

    this.appLogger.error(DomainErrorFilter.name, {
      msg: 'domain_error',
      code: exception.code,
      message: exception.message,
      details: exception.details ?? null,
      path: request.path,
      method: request.method,
    });

    const status = mapCodeToHttpStatus(exception.code);
    response.status(status).json({
      code: exception.code,
      message: exception.message,
      details: exception.details,
      correlationId,
      requestId,
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
    case DomainErrorCode.HCM_UNAVAILABLE:
      return HttpStatus.SERVICE_UNAVAILABLE;
    default:
      return HttpStatus.BAD_REQUEST;
  }
}
