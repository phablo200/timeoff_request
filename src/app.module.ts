import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
import { IdempotencyInterceptor } from './modules/idempotency/idempotency.interceptor';
import { IdempotencyService } from './modules/idempotency/idempotency.service';
import { ConfigService } from './config.service';
import { DatabaseService } from './persistence/database.service';
import { TimeOffRequestsController } from './modules/timeoff-requests/timeoff-requests.controller';
import { TimeOffRequestsRepository } from './modules/timeoff-requests/timeoff-requests.repository';
import { TimeOffRequestsService } from './modules/timeoff-requests/timeoff-requests.service';
import { DomainErrorFilter } from './domain-error.filter';

@Module({
  imports: [],
  controllers: [
    AppController,
    BalancesController,
    TimeOffRequestsController,
    WebhookController,
    SyncController,
    SyncAdminController,
  ],
  providers: [
    AppService,
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
    IdempotencyService,
    {
      provide: APP_FILTER,
      useClass: DomainErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
