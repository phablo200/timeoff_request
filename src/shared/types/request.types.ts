export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'SYNCED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED_SYNC'
  | 'REVERSED';

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
