import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import {
  DEFAULT_IDEMPOTENCY_TTL_SEC,
  DEFAULT_SYNC_MAX_ATTEMPTS,
  DEFAULT_SYNC_WORKER_INTERVAL_MS,
} from './defaults';

@Injectable()
export class ConfigService {
  readonly dbPath = process.env.DB_PATH ?? ':memory:';
  readonly syncWorkerIntervalMs = DEFAULT_SYNC_WORKER_INTERVAL_MS;
  readonly syncMaxAttempts = DEFAULT_SYNC_MAX_ATTEMPTS;
  readonly idempotencyTtlSec = DEFAULT_IDEMPOTENCY_TTL_SEC;

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
