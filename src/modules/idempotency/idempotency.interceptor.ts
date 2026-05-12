import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DomainError } from '../shared/domain/errors';
import { canonicalFingerprint } from './fingerprint';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & {
        body: unknown;
        method: string;
        url: string;
        headers: Record<string, string>;
      }
    >();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();

    if (request.method !== 'POST') {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      return next.handle();
    }

    const fingerprint = canonicalFingerprint({
      url: request.url,
      body: request.body,
    });
    const existing = this.idempotencyService.get(idempotencyKey);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new DomainError(
          'IDEMPOTENCY_KEY_CONFLICT',
          'idempotency key reuse with different payload',
        );
      }
      return of(existing.responseBody);
    }

    return next.handle().pipe(
      tap((data) => {
        this.idempotencyService.set({
          key: idempotencyKey,
          fingerprint,
          responseBody: data,
          statusCode: response.statusCode,
          createdAt: new Date().toISOString(),
        });
      }),
    );
  }
}
