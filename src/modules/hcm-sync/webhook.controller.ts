import { Body, Controller, Post } from '@nestjs/common';
import { RealtimeSyncService } from './realtime-sync.service';
import type { RealtimeBalanceEvent } from './realtime-sync.service';

@Controller('sync/hcm/realtime')
export class WebhookController {
  constructor(private readonly realtimeSyncService: RealtimeSyncService) {}

  @Post('balance-updates')
  ingest(@Body() event: RealtimeBalanceEvent) {
    return this.realtimeSyncService.processBalanceUpdate(event);
  }
}
