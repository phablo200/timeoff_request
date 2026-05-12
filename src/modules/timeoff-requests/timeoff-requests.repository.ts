import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../db/database.service';
import { SyncEvent, TimeOffRequest } from '../../shared/domain/types';

interface DueSyncEvent extends SyncEvent {
  requestId?: string;
  attemptCount: number;
}

@Injectable()
export class TimeOffRequestsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  create(request: TimeOffRequest): TimeOffRequest {
    this.databaseService
      .connection()
      .prepare(
        `INSERT INTO time_off_requests (id, employee_id, location_id, days, reason, status, sync_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        request.id,
        request.employeeId,
        request.locationId,
        request.days,
        request.reason ?? null,
        request.status,
        request.status === 'PENDING' ? null : 'PENDING_SYNC',
        request.createdAt,
        request.updatedAt,
      );

    return request;
  }

  findById(id: string): TimeOffRequest | undefined {
    const row = this.databaseService
      .connection()
      .prepare(
        `SELECT id, employee_id, location_id, days, reason, status, created_at, updated_at
         FROM time_off_requests WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          employee_id: string;
          location_id: string;
          days: number;
          reason: string | null;
          status: TimeOffRequest['status'];
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      employeeId: row.employee_id,
      locationId: row.location_id,
      days: row.days,
      reason: row.reason ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listAll(): TimeOffRequest[] {
    const rows = this.databaseService
      .connection()
      .prepare(
        `SELECT id, employee_id, location_id, days, reason, status, created_at, updated_at
         FROM time_off_requests
         ORDER BY created_at DESC`,
      )
      .all() as Array<{
      id: string;
      employee_id: string;
      location_id: string;
      days: number;
      reason: string | null;
      status: TimeOffRequest['status'];
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      locationId: row.location_id,
      days: row.days,
      reason: row.reason ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  save(request: TimeOffRequest): TimeOffRequest {
    this.databaseService
      .connection()
      .prepare(
        `UPDATE time_off_requests
         SET status = ?, reason = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        request.status,
        request.reason ?? null,
        request.updatedAt,
        request.id,
      );

    return request;
  }

  createSyncEvent(event: SyncEvent & { requestId?: string }): SyncEvent {
    this.databaseService
      .connection()
      .prepare(
        `INSERT INTO sync_events
        (id, direction, external_event_id, payload_hash, status, error, request_id, attempt_count, next_attempt_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        event.id,
        event.direction,
        event.externalEventId,
        event.payloadHash,
        event.status,
        event.error ?? null,
        event.requestId ?? null,
        new Date().toISOString(),
        event.createdAt,
      );

    return event;
  }

  listSyncEventsByRequestId(requestId: string): SyncEvent[] {
    const rows = this.databaseService
      .connection()
      .prepare(
        `SELECT id, direction, external_event_id, payload_hash, status, error, created_at
         FROM sync_events WHERE request_id = ?`,
      )
      .all(requestId) as Array<{
      id: string;
      direction: 'INBOUND' | 'OUTBOUND';
      external_event_id: string;
      payload_hash: string;
      status: 'PROCESSED' | 'FAILED' | 'QUEUED';
      error: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      externalEventId: row.external_event_id,
      payloadHash: row.payload_hash,
      status: row.status,
      error: row.error ?? undefined,
      createdAt: row.created_at,
    }));
  }

  listDueOutboundSyncEvents(limit: number): DueSyncEvent[] {
    const now = new Date().toISOString();
    const rows = this.databaseService
      .connection()
      .prepare(
        `SELECT id, direction, external_event_id, payload_hash, status, error, request_id, attempt_count, created_at
         FROM sync_events
         WHERE direction = 'OUTBOUND'
           AND status IN ('QUEUED', 'RETRY_PENDING')
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
         ORDER BY created_at ASC
         LIMIT ?`,
      )
      .all(now, limit) as Array<{
      id: string;
      direction: 'INBOUND' | 'OUTBOUND';
      external_event_id: string;
      payload_hash: string;
      status: 'PROCESSED' | 'FAILED' | 'QUEUED';
      error: string | null;
      request_id: string | null;
      attempt_count: number;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      direction: row.direction,
      externalEventId: row.external_event_id,
      payloadHash: row.payload_hash,
      status: row.status,
      error: row.error ?? undefined,
      requestId: row.request_id ?? undefined,
      attemptCount: row.attempt_count,
      createdAt: row.created_at,
    }));
  }

  markSyncEventRetry(
    id: string,
    attemptCount: number,
    nextAttemptAt: string,
    error: string,
  ): void {
    this.databaseService
      .connection()
      .prepare(
        `UPDATE sync_events
         SET status = 'RETRY_PENDING', attempt_count = ?, next_attempt_at = ?, error = ?
         WHERE id = ?`,
      )
      .run(attemptCount, nextAttemptAt, error, id);
  }

  markSyncEventSynced(id: string): void {
    this.databaseService
      .connection()
      .prepare(
        `UPDATE sync_events
         SET status = 'PROCESSED', processed_at = ?, next_attempt_at = NULL
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), id);
  }

  markSyncEventFailed(id: string, error: string): void {
    this.databaseService
      .connection()
      .prepare(
        `UPDATE sync_events
         SET status = 'FAILED', processed_at = ?, error = ?
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), error, id);
  }

  markRequestSynced(requestId: string): void {
    this.databaseService
      .connection()
      .prepare(
        `UPDATE time_off_requests SET status = 'SYNCED', sync_state = 'DONE', updated_at = ? WHERE id = ?`,
      )
      .run(new Date().toISOString(), requestId);
  }

  markRequestFailedAndReversed(requestId: string): void {
    const request = this.findById(requestId);
    if (!request) return;

    this.databaseService
      .connection()
      .prepare(
        `UPDATE time_off_requests
         SET status = 'REVERSED', sync_state = 'FAILED', updated_at = ?
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), requestId);

    this.databaseService
      .connection()
      .prepare(
        `UPDATE balances
         SET available_days = available_days + ?, version = version + 1, updated_at = ?
         WHERE employee_id = ? AND location_id = ?`,
      )
      .run(
        request.days,
        new Date().toISOString(),
        request.employeeId,
        request.locationId,
      );
  }

  flagRequestsForDrift(employeeId: string, locationId: string): number {
    const result = this.databaseService
      .connection()
      .prepare(
        `UPDATE time_off_requests
         SET drift_flag = 1, updated_at = ?
         WHERE employee_id = ?
           AND location_id = ?
           AND status IN ('PENDING', 'APPROVED')`,
      )
      .run(new Date().toISOString(), employeeId, locationId);

    return result.changes;
  }
}
