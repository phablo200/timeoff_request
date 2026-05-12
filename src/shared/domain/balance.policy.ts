import { DomainError } from './errors';

export function assertPositiveDays(days: number): void {
  if (!Number.isFinite(days) || days <= 0) {
    throw new DomainError('INVALID_DAYS', 'days must be positive');
  }
}

export function assertHasBalance(
  availableDays: number,
  requestedDays: number,
): void {
  if (availableDays - requestedDays < 0) {
    throw new DomainError('INSUFFICIENT_BALANCE', 'insufficient balance');
  }
}
