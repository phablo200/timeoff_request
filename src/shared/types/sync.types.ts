export interface SyncEvent {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  externalEventId: string;
  payloadHash: string;
  status: 'PROCESSED' | 'FAILED' | 'QUEUED';
  error?: string;
  createdAt: string;
}
