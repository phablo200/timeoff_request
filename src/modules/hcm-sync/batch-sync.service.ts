import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../db/database.service';
import { DomainErrorCode } from '../../filters/domain-error.filter';
import { BalancesRepository } from '../balances/balances.repository';
import { MetricsService } from '../observability/metrics.service';
import { DomainError } from '../../shared/domain/errors';
import { TimeOffRequestsRepository } from '../timeoff-requests/timeoff-requests.repository';
import { HcmClient } from './hcm.client';

interface BatchRow {
  employeeId: string;
  locationId: string;
  days: number;
}

interface BatchPayload {
  jobId: string;
  checksum: string;
  balances: BatchRow[];
  chunkSize?: number;
}

@Injectable()
export class BatchSyncService {
  private readonly logger = new Logger(BatchSyncService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly balancesRepository: BalancesRepository,
    private readonly hcmClient: HcmClient,
    private readonly requestsRepository: TimeOffRequestsRepository,
    private readonly metricsService: MetricsService,
  ) {}

  ingestBatch(payload: BatchPayload) {
    if (!payload.jobId || !payload.checksum) {
      throw new DomainError(
        DomainErrorCode.INVALID_DIMENSIONS,
        'jobId and checksum are required',
      );
    }

    const existingJob = this.databaseService
      .connection()
      .prepare(
        `SELECT job_id, checksum, processed_rows FROM batch_jobs WHERE job_id = ?`,
      )
      .get(payload.jobId) as
      | { job_id: string; checksum: string; processed_rows: number }
      | undefined;

    if (existingJob && existingJob.checksum === payload.checksum) {
      return {
        inserted: 0,
        updated: 0,
        unchanged: 0,
        rejected: 0,
        deduped: true,
        resumed: false,
      };
    }

    const chunkSize =
      payload.chunkSize && payload.chunkSize > 0 ? payload.chunkSize : 100;
    const now = new Date().toISOString();

    this.databaseService
      .connection()
      .prepare(
        `INSERT OR REPLACE INTO batch_jobs
         (job_id, checksum, status, total_rows, processed_rows, chunk_size, created_at, updated_at)
         VALUES (?, ?, 'RUNNING', ?, COALESCE((SELECT processed_rows FROM batch_jobs WHERE job_id = ?), 0), ?, COALESCE((SELECT created_at FROM batch_jobs WHERE job_id = ?), ?), ?)`,
      )
      .run(
        payload.jobId,
        payload.checksum,
        payload.balances.length,
        payload.jobId,
        chunkSize,
        payload.jobId,
        now,
        now,
      );

    const startAt = (
      this.databaseService
        .connection()
        .prepare(`SELECT processed_rows FROM batch_jobs WHERE job_id = ?`)
        .get(payload.jobId) as { processed_rows: number }
    ).processed_rows;

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let rejected = 0;

    for (let i = startAt; i < payload.balances.length; i += chunkSize) {
      const chunk = payload.balances.slice(i, i + chunkSize);

      for (const row of chunk) {
        if (
          !row.employeeId ||
          !row.locationId ||
          !Number.isFinite(row.days) ||
          row.days < 0
        ) {
          rejected += 1;
          this.databaseService
            .connection()
            .prepare(
              `INSERT INTO dead_letters (job_id, row_payload, reason, created_at) VALUES (?, ?, ?, ?)`,
            )
            .run(
              payload.jobId,
              JSON.stringify(row),
              'INVALID_ROW',
              new Date().toISOString(),
            );
          continue;
        }

        const existing = this.balancesRepository.get(
          row.employeeId,
          row.locationId,
        );
        if (!existing) {
          this.balancesRepository.upsertAbsolute(
            row.employeeId,
            row.locationId,
            row.days,
          );
          inserted += 1;
          continue;
        }

        if (existing.availableDays === row.days) {
          unchanged += 1;
          continue;
        }

        this.balancesRepository.upsertAbsolute(
          row.employeeId,
          row.locationId,
          row.days,
        );
        updated += 1;
      }

      const processedRows = Math.min(i + chunkSize, payload.balances.length);
      this.databaseService
        .connection()
        .prepare(
          `UPDATE batch_jobs SET processed_rows = ?, updated_at = ? WHERE job_id = ?`,
        )
        .run(processedRows, new Date().toISOString(), payload.jobId);

      this.databaseService
        .connection()
        .prepare(
          `INSERT INTO batch_checkpoints (job_id, checkpoint_index, processed_rows, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(
          payload.jobId,
          i / chunkSize,
          processedRows,
          new Date().toISOString(),
        );
    }

    this.databaseService
      .connection()
      .prepare(
        `UPDATE batch_jobs SET status = 'COMPLETED', updated_at = ? WHERE job_id = ?`,
      )
      .run(new Date().toISOString(), payload.jobId);

    return {
      inserted,
      updated,
      unchanged,
      rejected,
      deduped: false,
      resumed: startAt > 0,
    };
  }

  async reconcileOne(employeeId: string, locationId: string) {
    if (!employeeId || !locationId) {
      throw new DomainError(
        DomainErrorCode.INVALID_DIMENSIONS,
        'employeeId and locationId are required',
      );
    }

    const local = this.balancesRepository.get(employeeId, locationId);
    const hcmDays = await this.hcmClient.getBalance(employeeId, locationId);
    if (hcmDays === null) {
      throw new DomainError(
        DomainErrorCode.HCM_UNAVAILABLE,
        'hcm unavailable',
      );
    }

    if (hcmDays === undefined) {
      throw new DomainError(
        DomainErrorCode.INVALID_DIMENSIONS,
        'hcm balance key not found',
      );
    }

    const updated = !local || local.availableDays !== hcmDays;
    let flaggedRequests = 0;

    if (updated) {
      this.balancesRepository.upsertAbsolute(employeeId, locationId, hcmDays);
      flaggedRequests = this.requestsRepository.flagRequestsForDrift(
        employeeId,
        locationId,
      );

      const localDays = local?.availableDays ?? null;
      const delta = hcmDays - (localDays ?? 0);
      this.databaseService
        .connection()
        .prepare(
          `INSERT INTO drift_events (employee_id, location_id, local_days, hcm_days, delta, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          employeeId,
          locationId,
          localDays,
          hcmDays,
          delta,
          new Date().toISOString(),
        );

      this.metricsService.inc('reconciliation_drift_total');

      this.logger.log(
        JSON.stringify({
          msg: 'reconciliation_drift_detected',
          employeeId,
          locationId,
          localDays,
          hcmDays,
          reconciliation_drift_total: 1,
        }),
      );
    }

    return {
      employeeId,
      locationId,
      localDays: local?.availableDays ?? null,
      hcmDays,
      updated,
      flaggedRequests,
    };
  }
}
