import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../db/database.service';

@Injectable()
export class AppLoggerRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  insert(
    level: 'INFO' | 'ERROR',
    module: string,
    payload: Record<string, unknown>,
  ): void {
    this.databaseService
      .connection()
      .prepare(
        `
        INSERT INTO log (
          level,
          module,
          payload,
          correlation_id,
          request_id,
          external_event_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        level,
        module,
        JSON.stringify(payload),
        (payload.correlationId as string | null) ?? null,
        (payload.requestId as string | null) ?? null,
        (payload.externalEventId as string | null) ?? null,
        new Date().toISOString(),
      );
  }
}
