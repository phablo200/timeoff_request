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

  getBalance(employeeId: string, locationId: string): number | undefined | null {
    if (this.unavailable) {
      return null;
    }

    return this.balances.get(`${employeeId}::${locationId}`);
  }

  seedBalance(employeeId: string, locationId: string, days: number): void {
    this.balances.set(`${employeeId}::${locationId}`, days);
  }

  setUnavailable(value: boolean): void {
    this.unavailable = value;
  }

  setFailureMode(mode: FailureMode): void {
    this.failureMode = mode;
  }

  submitApprovedUsage(input: SubmitUsageInput): { ok: true } {
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
}
