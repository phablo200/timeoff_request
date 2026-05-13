import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from './request-context';

@Injectable()
export class AppLogger {
  log(module: string, payload: Record<string, unknown>): void {
    Logger.log(JSON.stringify(this.enrich(payload)), module);
  }

  error(module: string, payload: Record<string, unknown>): void {
    Logger.error(JSON.stringify(this.enrich(payload)), module);
  }

  private enrich(payload: Record<string, unknown>): Record<string, unknown> {
    const trace = RequestContext.get();

    return {
      ...payload,
      correlationId: trace?.correlationId ?? null,
      requestId: trace?.requestId ?? null,
      externalEventId: trace?.externalEventId ?? null,
    };
  }
}
