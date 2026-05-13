import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BalancesController } from './modules/balances/balances.controller';
import { BalancesRepository } from './modules/balances/balances.repository';
import { BalancesService } from './modules/balances/balances.service';
import { WebhookController } from './modules/hcm-sync/controllers/webhook.controller';
import { RealtimeSyncService } from './modules/hcm-sync/services/realtime-sync.service';
import { BatchSyncService } from './modules/hcm-sync/services/batch-sync.service';
import { HcmClient } from './modules/hcm-sync/clients/hcm.client';
import { SyncController } from './modules/hcm-sync/controllers/sync.controller';
import { SyncAdminController } from './modules/hcm-sync/controllers/sync-admin.controller';
import { OutboundSyncWorker } from './modules/hcm-sync/workers/outbound-sync.worker';
import { MetricsController } from './modules/observability/controllers/metrics.controller';
import { MetricsService } from './modules/observability/services/metrics.service';
import { TraceInterceptor } from './modules/observability/interceptors/trace.interceptor';
import { AppLogger } from './modules/observability/services/app-logger.service';
import { AppLoggerRepository } from './modules/observability/repository/app-logger.repository';
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
    AppLoggerRepository,
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
