import { DomainError } from './errors';
import { RequestStatus } from './types';

const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['SYNCED', 'FAILED_SYNC', 'REVERSED'],
  SYNCED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED_SYNC: ['REVERSED'],
  REVERSED: [],
};

export function assertTransition(
  current: RequestStatus,
  next: RequestStatus,
): void {
  if (!allowedTransitions[current].includes(next)) {
    throw new DomainError(
      'ILLEGAL_STATUS_TRANSITION',
      `cannot transition from ${current} to ${next}`,
    );
  }
}
