import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BatchSyncService } from './batch-sync.service';
import { DatabaseService } from '../../persistence/database.service';

interface BatchPayloadDto {
  jobId: string;
  checksum: string;
  balances: Array<{ employeeId: string; locationId: string; days: number }>;
}

@Controller('sync/hcm')
export class SyncController {
  constructor(
    private readonly batchSyncService: BatchSyncService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('batch/balances')
  ingestBatch(@Body() payload: BatchPayloadDto) {
    return this.batchSyncService.ingestBatch(payload);
  }

  @Post('reconcile/:employeeId/:locationId')
  reconcile(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.batchSyncService.reconcileOne(employeeId, locationId);
  }

  @Get('drift')
  driftReport() {
    const rows = this.databaseService
      .connection()
      .prepare(
        `SELECT employee_id, location_id, local_days, hcm_days, delta, created_at
         FROM drift_events
         ORDER BY id DESC
         LIMIT 100`,
      )
      .all();
    return { items: rows };
  }
}
