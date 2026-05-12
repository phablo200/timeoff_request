import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  readonly dbPath = process.env.DB_PATH ?? ':memory:';
  readonly syncWorkerIntervalMs = Number(
    process.env.SYNC_WORKER_INTERVAL_MS ?? '5000',
  );
  readonly syncMaxAttempts = Number(process.env.SYNC_MAX_ATTEMPTS ?? '5');
  readonly idempotencyTtlSec = Number(
    process.env.IDEMPOTENCY_TTL_SEC ?? '86400',
  );

  validate(): void {
    if (
      !Number.isFinite(this.syncWorkerIntervalMs) ||
      this.syncWorkerIntervalMs <= 0
    ) {
      throw new Error('SYNC_WORKER_INTERVAL_MS must be a positive number');
    }

    if (!Number.isFinite(this.syncMaxAttempts) || this.syncMaxAttempts <= 0) {
      throw new Error('SYNC_MAX_ATTEMPTS must be a positive number');
    }

    if (
      !Number.isFinite(this.idempotencyTtlSec) ||
      this.idempotencyTtlSec <= 0
    ) {
      throw new Error('IDEMPOTENCY_TTL_SEC must be a positive number');
    }
  }
}
