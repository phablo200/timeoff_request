export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'SYNCED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED_SYNC'
  | 'REVERSED';

export type LedgerEntryType =
  | 'RESERVATION'
  | 'REVERSAL'
  | 'HCM_REALTIME_ABSOLUTE'
  | 'HCM_REALTIME_DELTA';

export interface Balance {
  employeeId: string;
  locationId: string;
  availableDays: number;
  version: number;
  updatedAt: string;
  lastSyncedAt?: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  days: number;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
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

export interface SyncEvent {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  externalEventId: string;
  payloadHash: string;
  status: 'PROCESSED' | 'FAILED' | 'QUEUED';
  error?: string;
  createdAt: string;
}

export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
  responseBody: unknown;
  statusCode: number;
  createdAt: string;
}

export function balanceKey(employeeId: string, locationId: string): string {
  return `${employeeId}::${locationId}`;
}
