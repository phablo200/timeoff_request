import {
  assertHasBalance,
  assertPositiveDays,
} from '../../../src/modules/shared/domain/balance.policy';

describe('balance policy', () => {
  it('should reject approval when days <= 0', () => {
    expect(() => assertPositiveDays(0)).toThrow('days must be positive');
  });

  it('should reject approval when resulting balance would be negative', () => {
    expect(() => assertHasBalance(1, 2)).toThrow('insufficient balance');
  });
});
