import { assertTransition } from '../../../src/shared/domain/request-status.policy';

describe('request status policy', () => {
  it('should allow PENDING -> APPROVED transition', () => {
    expect(() => assertTransition('PENDING', 'APPROVED')).not.toThrow();
  });

  it('should reject APPROVED -> REJECTED transition', () => {
    expect(() => assertTransition('APPROVED', 'REJECTED')).toThrow(
      'cannot transition from APPROVED to REJECTED',
    );
  });
});
