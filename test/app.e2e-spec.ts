import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { HcmClient } from '../src/modules/hcm-sync/clients/hcm.client';

describe('Timeoff API (e2e)', () => {
  let app: INestApplication;
  let hcmClient: HcmClient;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    hcmClient = app.get(HcmClient);
  });

  it('creates and approves a request', async () => {
    type CreateRequestResponse = { id: string };
    type ApproveResponse = { status: string };
    type BalanceResponse = { availableDays: number };

    await request(app.getHttpServer())
      .post('/sync/hcm/realtime/balance-updates')
      .send({
        externalEventId: 'seed-1',
        employeeId: 'emp-1',
        locationId: 'loc-1',
        updateType: 'ABSOLUTE',
        days: 10,
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/timeoff-requests')
      .send({ employeeId: 'emp-1', locationId: 'loc-1', days: 2 })
      .expect(201);

    const createdBody = created.body as CreateRequestResponse;

    const approved = await request(app.getHttpServer())
      .post(`/timeoff-requests/${createdBody.id}/approve`)
      .expect(201);
    const approvedBody = approved.body as ApproveResponse;
    expect(approvedBody.status).toBe('APPROVED');

    const balance = await request(app.getHttpServer())
      .get('/balances/emp-1/loc-1')
      .expect(200);
    const balanceBody = balance.body as BalanceResponse;
    expect(balanceBody.availableDays).toBe(8);
  });

  it('returns generated trace headers when request has no correlation id', async () => {
    const response = await request(app.getHttpServer())
      .post('/timeoff-requests')
      .send({ employeeId: 'trace-emp', locationId: 'trace-loc', days: 1 })
      .expect(201);

    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('preserves inbound x-correlation-id and includes trace ids in error body', async () => {
    const response = await request(app.getHttpServer())
      .post('/timeoff-requests')
      .set('x-correlation-id', 'corr-test-1')
      .send({ employeeId: 'trace-emp', locationId: 'trace-loc', days: 0 })
      .expect(400);

    expect(response.headers['x-correlation-id']).toBe('corr-test-1');
    expect((response.body as { correlationId: string }).correlationId).toBe(
      'corr-test-1',
    );
    expect((response.body as { requestId?: string }).requestId).toBeDefined();
  });

  it('replays same Idempotency-Key with identical response and rejects payload mismatch', async () => {
    const idemKey = 'idem-1';

    const first = await request(app.getHttpServer())
      .post('/timeoff-requests')
      .set('Idempotency-Key', idemKey)
      .send({ employeeId: 'emp-2', locationId: 'loc-2', days: 1 })
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post('/timeoff-requests')
      .set('Idempotency-Key', idemKey)
      .send({ employeeId: 'emp-2', locationId: 'loc-2', days: 1 })
      .expect(201);

    expect(replay.body).toEqual(first.body);

    const conflict = await request(app.getHttpServer())
      .post('/timeoff-requests')
      .set('Idempotency-Key', idemKey)
      .send({ employeeId: 'emp-2', locationId: 'loc-2', days: 3 })
      .expect(400);

    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_KEY_CONFLICT',
    );
  });

  it('lists all time-off requests', async () => {
    await request(app.getHttpServer())
      .post('/timeoff-requests')
      .send({ employeeId: 'emp-list-1', locationId: 'loc-list', days: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/timeoff-requests')
      .send({ employeeId: 'emp-list-2', locationId: 'loc-list', days: 2 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/timeoff-requests')
      .expect(200);

    const items = response.body as Array<{
      employeeId: string;
      locationId: string;
      days: number;
    }>;

    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'emp-list-1',
          locationId: 'loc-list',
          days: 1,
        }),
        expect.objectContaining({
          employeeId: 'emp-list-2',
          locationId: 'loc-list',
          days: 2,
        }),
      ]),
    );
  });

  it('ingests batch balances and returns reconciliation report', async () => {
    const response = await request(app.getHttpServer())
      .post('/sync/hcm/batch/balances')
      .send({
        jobId: 'job-1',
        checksum: 'chk-1',
        balances: [
          { employeeId: 'e1', locationId: 'l1', days: 5 },
          { employeeId: 'e1', locationId: 'l1', days: 7 },
          { employeeId: '', locationId: 'l2', days: 3 },
        ],
      })
      .expect(201);

    expect(response.body).toEqual({
      inserted: 1,
      updated: 1,
      unchanged: 0,
      rejected: 1,
      deduped: false,
    });
  });

  it('dedupes repeated batch payload by jobId + checksum', async () => {
    await request(app.getHttpServer())
      .post('/sync/hcm/batch/balances')
      .send({
        jobId: 'job-2',
        checksum: 'chk-2',
        balances: [{ employeeId: 'e1', locationId: 'l1', days: 4 }],
      })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/sync/hcm/batch/balances')
      .send({
        jobId: 'job-2',
        checksum: 'chk-2',
        balances: [{ employeeId: 'e1', locationId: 'l1', days: 10 }],
      })
      .expect(201);

    expect((duplicate.body as { deduped: boolean }).deduped).toBe(true);

    const balance = await request(app.getHttpServer())
      .get('/balances/e1/l1')
      .expect(200);
    expect((balance.body as { availableDays: number }).availableDays).toBe(4);
  });

  it('reconciles local projection with HCM source-of-truth absolute value', async () => {
    await request(app.getHttpServer())
      .post('/sync/hcm/batch/balances')
      .send({
        jobId: 'job-3',
        checksum: 'chk-3',
        balances: [{ employeeId: 'e1', locationId: 'l1', days: 2 }],
      })
      .expect(201);

    hcmClient.seedBalance('e1', 'l1', 9);

    const reconcile = await request(app.getHttpServer())
      .post('/sync/hcm/reconcile/e1/l1')
      .expect(201);
    const reconcileBody = reconcile.body as {
      updated: boolean;
      hcmDays: number;
      localDays: number;
    };
    expect(reconcileBody.updated).toBe(true);
    expect(reconcileBody.hcmDays).toBe(9);
    expect(reconcileBody.localDays).toBe(2);

    const balance = await request(app.getHttpServer())
      .get('/balances/e1/l1')
      .expect(200);
    expect((balance.body as { availableDays: number }).availableDays).toBe(9);
  });

  it('returns HCM_UNAVAILABLE when reconcile cannot reach HCM', async () => {
    hcmClient.setUnavailable(true);

    const response = await request(app.getHttpServer())
      .post('/sync/hcm/reconcile/e1/l1')
      .expect(400);
    expect((response.body as { code: string }).code).toBe('HCM_UNAVAILABLE');
  });

  afterEach(async () => {
    await app.close();
  });
});
