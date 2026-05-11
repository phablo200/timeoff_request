# Error Handling, Idempotency, and Retries

## Idempotency
- Client writes support `Idempotency-Key` header.
- Persist key + request fingerprint + response reference.
- Replays with same fingerprint return original response; mismatched payload returns conflict.

## Retry Strategy
- External HCM calls use bounded exponential backoff with jitter.
- Retry only transient classes (timeout, 429, 5xx).
- No retries for validation/business errors (4xx functional failures).

## Defensive Validation
- Validate `employeeId`, `locationId`, and positive `days` before business transitions.
- Enforce status transition matrix in domain service.
- Verify local balance before approval even if HCM usually rejects invalid requests.

## Failure Modes
- HCM down: keep request in `APPROVED` + `PENDING_SYNC` marker, retry asynchronously.
- Poison webhook event: move to dead-letter table with reason and payload snapshot.
- Batch partial failure: commit successful chunks, emit failure report, allow restart from checkpoint.
