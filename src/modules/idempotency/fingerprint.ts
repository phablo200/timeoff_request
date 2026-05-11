function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const keys = Object.keys(input).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = canonicalize(input[key]);
    }
    return out;
  }

  return value;
}

export function canonicalFingerprint(payload: unknown): string {
  return JSON.stringify(canonicalize(payload));
}
