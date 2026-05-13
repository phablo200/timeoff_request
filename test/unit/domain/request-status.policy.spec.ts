import { assertTransition } from '../../../src/shared/domain/request-status.policy';
import { RequestStatus } from '../../../src/shared/types/request.types';

describe('request status policy', () => {
  it('should allow PENDING -> APPROVED transition', () => {
    expect(() =>
      assertTransition(RequestStatus.PENDING, RequestStatus.APPROVED),
    ).not.toThrow();
  });

  it('should reject APPROVED -> REJECTED transition', () => {
    expect(() =>
      assertTransition(RequestStatus.APPROVED, RequestStatus.REJECTED),
    ).toThrow('cannot transition from APPROVED to REJECTED');
  });
});
