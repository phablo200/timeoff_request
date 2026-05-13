export enum SyncDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum SyncStatus {
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  QUEUED = 'QUEUED',
  RETRY_PENDING = 'RETRY_PENDING',
}

export interface SyncEvent {
  id: string;
  direction: SyncDirection;
  externalEventId: string;
  payloadHash: string;
  status: SyncStatus;
  error?: string;
  createdAt: string;
}
