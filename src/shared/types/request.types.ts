export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SYNCED = 'SYNCED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FAILED_SYNC = 'FAILED_SYNC',
  REVERSED = 'REVERSED',
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
