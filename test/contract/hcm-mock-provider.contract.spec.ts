import {
  resetHcm,
  setFailureMode,
  startHcmMock,
  stopHcmMock,
  upsertBalance,
} from './helpers/hcm-contract.harness';
import {
  consumePayload,
  CONTRACT_EMPLOYEE_ID,
  CONTRACT_LOCATION_ID,
} from './helpers/hcm-fixtures';

jest.setTimeout(30_000);

describe('HCM Mock Provider Contract', () => {
  const port = 4111;
  let baseUrl = '';

  beforeAll(async () => {
    baseUrl = await startHcmMock({ port });
  });

  afterAll(async () => {
    await stopHcmMock();
  });

  beforeEach(async () => {
    await resetHcm(baseUrl);
  });

  it('GET /balances/:employeeId/:locationId -> 200 with days when seeded', async () => {
    await upsertBalance({
      baseUrl,
      employeeId: CONTRACT_EMPLOYEE_ID,
      locationId: CONTRACT_LOCATION_ID,
      days: 7,
    });

    const response = await fetch(
      `${baseUrl}/balances/${CONTRACT_EMPLOYEE_ID}/${CONTRACT_LOCATION_ID}`,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ days: 7 });
  });

  it('GET /balances/:employeeId/:locationId -> 404 with code for missing dimensions', async () => {
    const response = await fetch(`${baseUrl}/balances/missing/missing`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_DIMENSIONS',
    });
  });

  it('GET /balances/:employeeId/:locationId -> 503 with code in transient mode', async () => {
    await setFailureMode(baseUrl, 'transient');

    const response = await fetch(`${baseUrl}/balances/missing/missing`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: 'HCM_UNAVAILABLE',
    });
  });

  it('POST /timeoff/consume -> 200 with ok on valid request', async () => {
    await upsertBalance({
      baseUrl,
      employeeId: CONTRACT_EMPLOYEE_ID,
      locationId: CONTRACT_LOCATION_ID,
      days: 3,
    });

    const response = await fetch(`${baseUrl}/timeoff/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(consumePayload({ days: 2 })),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it('POST /timeoff/consume -> 400 for invalid payload', async () => {
    const response = await fetch(`${baseUrl}/timeoff/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(consumePayload({ days: 0 })),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_DIMENSIONS',
    });
  });

  it('POST /timeoff/consume -> 422 with code for insufficient balance', async () => {
    await upsertBalance({
      baseUrl,
      employeeId: CONTRACT_EMPLOYEE_ID,
      locationId: CONTRACT_LOCATION_ID,
      days: 1,
    });

    const response = await fetch(`${baseUrl}/timeoff/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(consumePayload({ days: 2 })),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
  });

  it('POST /admin/balances/upsert -> 400 for invalid payload', async () => {
    const response = await fetch(`${baseUrl}/admin/balances/upsert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ employeeId: '', locationId: 'loc-1', days: -1 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_DIMENSIONS',
    });
  });

  it('POST /admin/failure-mode -> 400 for invalid mode', async () => {
    const response = await fetch(`${baseUrl}/admin/failure-mode`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'bad-mode' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_MODE' });
  });
});
