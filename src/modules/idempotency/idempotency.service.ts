import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { DatabaseService } from '../../db/database.service';
import { IdempotencyRecord } from '../../shared/domain/types';

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  get(key: string): IdempotencyRecord | undefined {
    this.cleanupExpired();

    const row = this.databaseService
      .connection()
      .prepare(
        `SELECT key, fingerprint, response_body, status_code, created_at
         FROM idempotency_records WHERE key = ?`,
      )
      .get(key) as
      | {
          key: string;
          fingerprint: string;
          response_body: string;
          status_code: number;
          created_at: string;
        }
      | undefined;

    if (!row) return undefined;

    return {
      key: row.key,
      fingerprint: row.fingerprint,
      responseBody: JSON.parse(row.response_body),
      statusCode: row.status_code,
      createdAt: row.created_at,
    };
  }

  set(record: IdempotencyRecord): void {
    const expiresAt = new Date(
      Date.now() + this.configService.idempotencyTtlSec * 1000,
    ).toISOString();

    this.databaseService
      .connection()
      .prepare(
        `INSERT OR REPLACE INTO idempotency_records
        (key, fingerprint, response_body, status_code, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.key,
        record.fingerprint,
        JSON.stringify(record.responseBody),
        record.statusCode,
        record.createdAt,
        expiresAt,
      );
  }

  cleanupExpired(): void {
    this.databaseService
      .connection()
      .prepare(`DELETE FROM idempotency_records WHERE expires_at <= ?`)
      .run(new Date().toISOString());
  }
}
