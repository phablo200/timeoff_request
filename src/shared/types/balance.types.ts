export enum LedgerEntryType {
  RESERVATION = 'RESERVATION',
  REVERSAL = 'REVERSAL',
  HCM_REALTIME_ABSOLUTE = 'HCM_REALTIME_ABSOLUTE',
  HCM_REALTIME_DELTA = 'HCM_REALTIME_DELTA',
}

export interface Balance {
  employeeId: string;
  locationId: string;
  availableDays: number;
  version: number;
  updatedAt: string;
  lastSyncedAt?: string;
}

export interface BalanceLedgerEntry {
  id: string;
  balanceKey: string;
  type: LedgerEntryType;
  days: number;
  requestId?: string;
  source: string;
  createdAt: string;
}

export function balanceKey(employeeId: string, locationId: string): string {
  return `${employeeId}::${locationId}`;
}
