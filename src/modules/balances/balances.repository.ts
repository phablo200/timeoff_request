import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../db/database.service';
import { Balance, BalanceLedgerEntry } from '../../shared/types/balance.types';

@Injectable()
export class BalancesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  get(employeeId: string, locationId: string): Balance | undefined {
    const row = this.databaseService
      .connection()
      .prepare(
        `SELECT employee_id, location_id, available_days, version, updated_at, last_synced_at
         FROM balances WHERE employee_id = ? AND location_id = ?`,
      )
      .get(employeeId, locationId) as
      | {
          employee_id: string;
          location_id: string;
          available_days: number;
          version: number;
          updated_at: string;
          last_synced_at: string | null;
        }
      | undefined;

    if (!row) return undefined;

    return {
      employeeId: row.employee_id,
      locationId: row.location_id,
      availableDays: row.available_days,
      version: row.version,
      updatedAt: row.updated_at,
      lastSyncedAt: row.last_synced_at ?? undefined,
    };
  }

  upsertAbsolute(
    employeeId: string,
    locationId: string,
    availableDays: number,
  ): Balance {
    const now = new Date().toISOString();
    this.databaseService
      .connection()
      .prepare(
        `INSERT INTO balances (employee_id, location_id, available_days, version, updated_at, last_synced_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(employee_id, location_id) DO UPDATE SET
         available_days = excluded.available_days,
         version = balances.version + 1,
         updated_at = excluded.updated_at,
         last_synced_at = excluded.last_synced_at`,
      )
      .run(employeeId, locationId, availableDays, now, now);

    return this.get(employeeId, locationId)!;
  }

  applyDelta(
    employeeId: string,
    locationId: string,
    deltaDays: number,
  ): Balance {
    const existing =
      this.get(employeeId, locationId) ??
      this.upsertAbsolute(employeeId, locationId, 0);
    return this.upsertAbsolute(
      employeeId,
      locationId,
      existing.availableDays + deltaDays,
    );
  }

  consumeWithVersion(
    employeeId: string,
    locationId: string,
    days: number,
    expectedVersion: number,
  ): Balance | undefined {
    const now = new Date().toISOString();

    const result = this.databaseService
      .connection()
      .prepare(
        `UPDATE balances
       SET available_days = available_days - ?, version = version + 1, updated_at = ?
       WHERE employee_id = ? AND location_id = ? AND version = ? AND available_days - ? >= 0`,
      )
      .run(days, now, employeeId, locationId, expectedVersion, days);

    if (result.changes === 0) {
      return undefined;
    }

    return this.get(employeeId, locationId);
  }

  recordInboundSyncEvent(
    externalEventId: string,
    payloadHash: string,
  ): { inserted: boolean } {
    const result = this.databaseService
      .connection()
      .prepare(
        `INSERT OR IGNORE INTO sync_events
         (id, direction, external_event_id, payload_hash, status, error, created_at)
         VALUES (?, 'INBOUND', ?, ?, 'PROCESSED', NULL, ?)`,
      )
      .run(
        `${externalEventId}:${payloadHash}`,
        externalEventId,
        payloadHash,
        new Date().toISOString(),
      );

    return { inserted: result.changes > 0 };
  }

  insertLedgerEntry(entry: BalanceLedgerEntry): void {
    this.databaseService
      .connection()
      .prepare(
        `INSERT INTO balance_ledger
         (id, balance_key, type, days, request_id, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.balanceKey,
        entry.type,
        entry.days,
        entry.requestId ?? null,
        entry.source,
        entry.createdAt,
      );
  }
}
