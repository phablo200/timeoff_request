import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { RequestContext } from '../request-context';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const correlationIdHeader = request.headers['x-correlation-id'];
    const correlationId =
      typeof correlationIdHeader === 'string' && correlationIdHeader.trim()
        ? correlationIdHeader
        : randomUUID();
    const requestId = randomUUID();

    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('x-request-id', requestId);

    return new Observable((subscriber) => {
      RequestContext.run({ correlationId, requestId }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
