import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { AppLogger } from '../observability/app-logger.service';
import { MetricsService } from '../observability/metrics.service';
import { RequestContext } from '../observability/request-context';
import { TimeOffRequestsRepository } from '../timeoff-requests/timeoff-requests.repository';
import { HcmClient } from './hcm.client';

@Injectable()
export class OutboundSyncWorker {
  constructor(
    private readonly requestsRepository: TimeOffRequestsRepository,
    private readonly hcmClient: HcmClient,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly appLogger: AppLogger,
  ) {}

  async processDueEvents(limit = 10): Promise<{ processed: number }> {
    const due = this.requestsRepository.listDueOutboundSyncEvents(limit);
    let processed = 0;

    for (const event of due) {
      const payload = JSON.parse(event.payloadHash) as {
        employeeId: string;
        locationId: string;
        days: number;
        trace?: { correlationId: string; requestId: string };
      };

      await RequestContext.run(
        {
          correlationId:
            payload.trace?.correlationId ?? `sync:${event.externalEventId}`,
          requestId: payload.trace?.requestId ?? `sync-event:${event.id}`,
          externalEventId: event.externalEventId,
        },
        async () => {
          const startedAt = Date.now();
          try {
            await this.hcmClient.submitApprovedUsage({
              employeeId: payload.employeeId,
              locationId: payload.locationId,
              days: payload.days,
            });
            this.requestsRepository.markRequestSynced(event.requestId!);
            this.requestsRepository.markSyncEventSynced(event.id);
            processed += 1;

            this.metricsService.observe(
              'hcm_sync_latency_ms',
              Date.now() - startedAt,
            );

            this.appLogger.log(OutboundSyncWorker.name, {
              msg: 'outbound_sync_success',
              syncEventId: event.id,
              hcmSyncLatencyMs: Date.now() - startedAt,
            });
          } catch (error) {
            this.metricsService.inc('hcm_sync_failures_total');

            const err = error as Error & { kind?: string };
            const transient = err.kind === 'TRANSIENT';
            this.appLogger.error(OutboundSyncWorker.name, {
              msg: 'outbound_sync_failure',
              syncEventId: event.id,
              transient,
              error: err.message,
              attemptCount: event.attemptCount,
            });

            if (
              transient &&
              event.attemptCount + 1 < this.configService.syncMaxAttempts
            ) {
              this.requestsRepository.markSyncEventRetry(
                event.id,
                event.attemptCount + 1,
                this.computeNextAttemptIso(event.attemptCount + 1),
                err.message,
              );
            } else {
              this.requestsRepository.markSyncEventFailed(event.id, err.message);
              this.requestsRepository.markRequestFailedAndReversed(
                event.requestId!,
              );
            }
          }
        },
      );
    }

    return { processed };
  }

  private computeNextAttemptIso(attempt: number): string {
    const baseMs = 250;
    const jitter = Math.floor(Math.random() * 100);
    const delay = Math.min(baseMs * 2 ** attempt + jitter, 30_000);
    return new Date(Date.now() + delay).toISOString();
  }
}
