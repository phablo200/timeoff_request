import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BalancesController } from './modules/balances/balances.controller';
import { BalancesRepository } from './modules/balances/balances.repository';
import { BalancesService } from './modules/balances/balances.service';
import { WebhookController } from './modules/hcm-sync/webhook.controller';
import { RealtimeSyncService } from './modules/hcm-sync/realtime-sync.service';
import { BatchSyncService } from './modules/hcm-sync/batch-sync.service';
import { HcmClient } from './modules/hcm-sync/hcm.client';
import { SyncController } from './modules/hcm-sync/sync.controller';
import { SyncAdminController } from './modules/hcm-sync/sync-admin.controller';
import { OutboundSyncWorker } from './modules/hcm-sync/outbound-sync.worker';
import { MetricsController } from './modules/observability/metrics.controller';
import { MetricsService } from './modules/observability/metrics.service';
import { TraceInterceptor } from './modules/observability/trace.interceptor';
import { AppLogger } from './modules/observability/app-logger.service';
import { IdempotencyInterceptor } from './modules/idempotency/idempotency.interceptor';
import { IdempotencyService } from './modules/idempotency/idempotency.service';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './db/database.service';
import { TimeOffRequestsController } from './modules/timeoff-requests/timeoff-requests.controller';
import { TimeOffRequestsRepository } from './modules/timeoff-requests/timeoff-requests.repository';
import { TimeOffRequestsService } from './modules/timeoff-requests/timeoff-requests.service';
import { DomainErrorFilter } from './filters/domain-error.filter';

@Module({
  imports: [],
  controllers: [
    BalancesController,
    TimeOffRequestsController,
    WebhookController,
    SyncController,
    SyncAdminController,
    MetricsController,
  ],
  providers: [
    ConfigService,
    DatabaseService,
    BalancesRepository,
    BalancesService,
    TimeOffRequestsRepository,
    TimeOffRequestsService,
    RealtimeSyncService,
    BatchSyncService,
    OutboundSyncWorker,
    HcmClient,
    MetricsService,
    AppLogger,
    IdempotencyService,
    {
      provide: APP_FILTER,
      useClass: DomainErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
