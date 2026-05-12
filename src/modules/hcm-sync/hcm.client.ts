import { Injectable } from '@nestjs/common';

interface SubmitUsageInput {
  employeeId: string;
  locationId: string;
  days: number;
}

type FailureMode = 'NONE' | 'TRANSIENT' | 'FUNCTIONAL';

@Injectable()
export class HcmClient {
  private readonly balances = new Map<string, number>();
  private unavailable = false;
  private failureMode: FailureMode = 'NONE';
  private readonly baseUrl = process.env.HCM_BASE_URL;

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<number | undefined | null> {
    if (this.baseUrl) {
      const response = await fetch(
        `${this.baseUrl}/balances/${employeeId}/${locationId}`,
      );
      if (response.status === 503) return null;
      if (response.status === 404) return undefined;
      if (!response.ok) return null;
      const body = (await response.json()) as { days: number };
      return body.days;
    }

    if (this.unavailable) {
      return null;
    }

    return this.balances.get(`${employeeId}::${locationId}`);
  }

  async submitApprovedUsage(input: SubmitUsageInput): Promise<{ ok: true }> {
    if (this.baseUrl) {
      const response = await fetch(`${this.baseUrl}/timeoff/consume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (response.status === 503 || response.status >= 500) {
        const err = new Error('HCM transient failure');
        (err as Error & { kind?: string }).kind = 'TRANSIENT';
        throw err;
      }

      if (!response.ok) {
        const err = new Error('HCM functional failure');
        (err as Error & { kind?: string }).kind = 'FUNCTIONAL';
        throw err;
      }

      return { ok: true };
    }

    if (this.unavailable || this.failureMode === 'TRANSIENT') {
      const err = new Error('HCM transient failure');
      (err as Error & { kind?: string }).kind = 'TRANSIENT';
      throw err;
    }

    if (this.failureMode === 'FUNCTIONAL') {
      const err = new Error('HCM functional failure');
      (err as Error & { kind?: string }).kind = 'FUNCTIONAL';
      throw err;
    }

    const key = `${input.employeeId}::${input.locationId}`;
    const available = this.balances.get(key) ?? 0;
    this.balances.set(key, available - input.days);
    return { ok: true };
  }

  async seedBalance(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<void> {
    if (this.baseUrl) {
      await fetch(`${this.baseUrl}/admin/balances/upsert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ employeeId, locationId, days }),
      });
      return;
    }

    this.balances.set(`${employeeId}::${locationId}`, days);
  }

  async setUnavailable(value: boolean): Promise<void> {
    if (this.baseUrl) {
      await fetch(`${this.baseUrl}/admin/failure-mode`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: value ? 'transient' : 'none' }),
      });
      return;
    }

    this.unavailable = value;
  }

  async setFailureMode(mode: FailureMode): Promise<void> {
    if (this.baseUrl) {
      const mapped =
        mode === 'NONE'
          ? 'none'
          : mode === 'TRANSIENT'
            ? 'transient'
            : 'functional';
      await fetch(`${this.baseUrl}/admin/failure-mode`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: mapped }),
      });
      return;
    }

    this.failureMode = mode;
  }
}
