import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { MetricsService } from '../observability/metrics.service';
import { TimeOffRequestsRepository } from '../timeoff-requests/timeoff-requests.repository';
import { HcmClient } from './hcm.client';

@Injectable()
export class OutboundSyncWorker {
  private readonly logger = new Logger(OutboundSyncWorker.name);

  constructor(
    private readonly requestsRepository: TimeOffRequestsRepository,
    private readonly hcmClient: HcmClient,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  async processDueEvents(limit = 10): Promise<{ processed: number }> {
    const due = this.requestsRepository.listDueOutboundSyncEvents(limit);
    let processed = 0;

    for (const event of due) {
      const startedAt = Date.now();
      try {
        const payload = JSON.parse(event.payloadHash) as {
          employeeId: string;
          locationId: string;
          days: number;
        };

        await this.hcmClient.submitApprovedUsage(payload);
        this.requestsRepository.markRequestSynced(event.requestId!);
        this.requestsRepository.markSyncEventSynced(event.id);
        processed += 1;

        this.metricsService.observe(
          'hcm_sync_latency_ms',
          Date.now() - startedAt,
        );

        this.logger.log(
          JSON.stringify({
            msg: 'outbound_sync_success',
            externalEventId: event.externalEventId,
            syncEventId: event.id,
            hcm_sync_latency_ms: Date.now() - startedAt,
          }),
        );
      } catch (error) {
        this.metricsService.inc('hcm_sync_failures_total');

        const err = error as Error & { kind?: string };
        const transient = err.kind === 'TRANSIENT';

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
