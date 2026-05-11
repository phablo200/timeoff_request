import { ConfigService } from '../../config.service';
import { DatabaseService } from '../../persistence/database.service';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  it('cleans up expired records', () => {
    process.env.DB_PATH = ':memory:';
    process.env.IDEMPOTENCY_TTL_SEC = '1';
    const config = new ConfigService();
    const db = new DatabaseService(config);
    const service = new IdempotencyService(db, config);

    service.set({
      key: 'k1',
      fingerprint: 'f1',
      responseBody: { ok: true },
      statusCode: 201,
      createdAt: new Date(0).toISOString(),
    });

    db.connection()
      .prepare(`UPDATE idempotency_records SET expires_at = ? WHERE key = 'k1'`)
      .run(new Date(0).toISOString());

    expect(service.get('k1')).toBeUndefined();
  });
});
