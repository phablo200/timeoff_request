import { ChildProcess, spawn } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

interface StartOptions {
  port: number;
}

let mockProcess: ChildProcess | undefined;

function getBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

export async function startHcmMock({ port }: StartOptions): Promise<string> {
  if (mockProcess) {
    throw new Error('HCM mock already started');
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'hcm-contract-'));
  const dbPath = join(tempDir, 'hcm.sqlite');

  mockProcess = spawn(
    process.execPath,
    ['-r', 'ts-node/register', 'test/mocks/hcm-mock.server.ts'],
    {
      cwd: process.cwd(),
      stdio: 'ignore',
      env: {
        ...process.env,
        HCM_MOCK_PORT: String(port),
        HCM_MOCK_DB_PATH: dbPath,
      },
    },
  );

  const baseUrl = getBaseUrl(port);
  await waitForServer(baseUrl);
  return baseUrl;
}

export async function stopHcmMock(): Promise<void> {
  if (!mockProcess) {
    return;
  }

  const processToStop = mockProcess;
  mockProcess = undefined;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    processToStop.once('exit', finish);
    processToStop.kill('SIGTERM');

    setTimeout(() => {
      if (!processToStop.killed) {
        processToStop.kill('SIGKILL');
      }
      finish();
    }, 1_000);
  });
}

export async function resetHcm(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}/admin/reset`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to reset HCM mock: ${response.status}`);
  }
}

export async function upsertBalance(input: {
  baseUrl: string;
  employeeId: string;
  locationId: string;
  days: number;
}): Promise<void> {
  const response = await fetch(`${input.baseUrl}/admin/balances/upsert`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      employeeId: input.employeeId,
      locationId: input.locationId,
      days: input.days,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to seed HCM balance: ${response.status}`);
  }
}

export async function setFailureMode(
  baseUrl: string,
  mode: 'none' | 'transient' | 'functional',
): Promise<void> {
  const response = await fetch(`${baseUrl}/admin/failure-mode`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    throw new Error(`Failed to set HCM failure mode: ${response.status}`);
  }
}

async function waitForServer(baseUrl: string): Promise<void> {
  const timeoutAt = Date.now() + 15_000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(`${baseUrl}/admin/reset`, { method: 'POST' });
      if (response.ok) {
        return;
      }
    } catch {
      // retry until timeout
    }

    await sleep(100);
  }

  throw new Error(`Timed out waiting for HCM mock at ${baseUrl}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
