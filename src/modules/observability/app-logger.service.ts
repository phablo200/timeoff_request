import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from './request-context';
import { AppLoggerRepository } from './app-logger.repository';

@Injectable()
export class AppLogger {
  constructor(private readonly appLoggerRepository: AppLoggerRepository) {}

  log(module: string, payload: Record<string, unknown>): void {
    const enriched = this.enrich(payload);
    Logger.log(JSON.stringify(enriched), module);
    this.persist('INFO', module, enriched);
  }

  error(module: string, payload: Record<string, unknown>): void {
    const enriched = this.enrich(payload);
    Logger.error(JSON.stringify(enriched), module);
    this.persist('ERROR', module, enriched);
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

  private persist(
    level: 'INFO' | 'ERROR',
    module: string,
    payload: Record<string, unknown>,
  ): void {
    try {
      this.appLoggerRepository.insert(level, module, payload);
    } catch (error) {
      const err = error as Error;
      Logger.error(
        JSON.stringify({
          msg: 'app_logger_persist_failed',
          error: err.message,
        }),
        AppLogger.name,
      );
    }
  }
}
