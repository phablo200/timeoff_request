import { DomainError } from './errors';
import { RequestStatus } from '../types/request.types';

const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PENDING]: [
    RequestStatus.APPROVED,
    RequestStatus.REJECTED,
    RequestStatus.CANCELLED,
  ],
  [RequestStatus.APPROVED]: [
    RequestStatus.SYNCED,
    RequestStatus.FAILED_SYNC,
    RequestStatus.REVERSED,
  ],
  [RequestStatus.SYNCED]: [],
  [RequestStatus.REJECTED]: [],
  [RequestStatus.CANCELLED]: [],
  [RequestStatus.FAILED_SYNC]: [RequestStatus.REVERSED],
  [RequestStatus.REVERSED]: [],
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
