import { canonicalFingerprint } from './fingerprint';

describe('canonicalFingerprint', () => {
  it('returns same fingerprint for equivalent object key order', () => {
    const a = canonicalFingerprint({ url: '/x', body: { b: 2, a: 1 } });
    const b = canonicalFingerprint({ body: { a: 1, b: 2 }, url: '/x' });

    expect(a).toBe(b);
  });
});
