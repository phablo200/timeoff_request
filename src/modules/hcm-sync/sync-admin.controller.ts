import { Controller, Post, Query } from '@nestjs/common';
import { OutboundSyncWorker } from './outbound-sync.worker';

@Controller('sync/hcm/outbound')
export class SyncAdminController {
  constructor(private readonly outboundSyncWorker: OutboundSyncWorker) {}

  @Post('process')
  process(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 10;
    return this.outboundSyncWorker.processDueEvents(Number.isFinite(parsed) ? parsed : 10);
  }
}
