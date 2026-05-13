import { HcmClient } from '../../src/modules/hcm-sync/clients/hcm.client';
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

describe('HcmClient Contract (consumer)', () => {
  const port = 4110;
  let baseUrl = '';

  beforeAll(async () => {
    baseUrl = await startHcmMock({ port });
  });

  afterAll(async () => {
    await stopHcmMock();
  });

  beforeEach(async () => {
    await resetHcm(baseUrl);
    delete process.env.HCM_BASE_URL;
  });

  function createClient(): HcmClient {
    process.env.HCM_BASE_URL = baseUrl;
    return new HcmClient();
  }

  it('getBalance: returns days for 200 response', async () => {
    await upsertBalance({
      baseUrl,
      employeeId: CONTRACT_EMPLOYEE_ID,
      locationId: CONTRACT_LOCATION_ID,
      days: 15,
    });

    const client = createClient();
    await expect(
      client.getBalance(CONTRACT_EMPLOYEE_ID, CONTRACT_LOCATION_ID),
    ).resolves.toBe(15);
  });

  it('getBalance: returns undefined for 404 response', async () => {
    const client = createClient();
    await expect(
      client.getBalance('missing-emp', CONTRACT_LOCATION_ID),
    ).resolves.toBeUndefined();
  });

  it('getBalance: returns null for transient 503 response', async () => {
    await setFailureMode(baseUrl, 'transient');

    const client = createClient();
    await expect(
      client.getBalance(CONTRACT_EMPLOYEE_ID, CONTRACT_LOCATION_ID),
    ).resolves.toBeNull();
  });

  it('submitApprovedUsage: returns ok on success', async () => {
    await upsertBalance({
      baseUrl,
      employeeId: CONTRACT_EMPLOYEE_ID,
      locationId: CONTRACT_LOCATION_ID,
      days: 10,
    });

    const client = createClient();
    await expect(client.submitApprovedUsage(consumePayload())).resolves.toEqual({
      ok: true,
    });
  });

  it('submitApprovedUsage: throws TRANSIENT for transient failures', async () => {
    await setFailureMode(baseUrl, 'transient');

    const client = createClient();
    await expect(client.submitApprovedUsage(consumePayload())).rejects.toMatchObject({
      kind: 'TRANSIENT',
    });
  });

  it('submitApprovedUsage: throws FUNCTIONAL for functional failures', async () => {
    await upsertBalance({
      baseUrl,
      employeeId: CONTRACT_EMPLOYEE_ID,
      locationId: CONTRACT_LOCATION_ID,
      days: 0,
    });

    const client = createClient();
    await expect(client.submitApprovedUsage(consumePayload())).rejects.toMatchObject({
      kind: 'FUNCTIONAL',
    });
  });
});
