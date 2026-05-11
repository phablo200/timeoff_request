# Rollout, Observability, and Risks

## Rollout Plan
- Phase 1: core lifecycle + local invariants + outbound sync.
- Phase 2: realtime inbound sync + idempotency hardening.
- Phase 3: batch ingestion + reconciliation tooling + reporting.

## Observability
- Structured logs with `correlationId`, `requestId`, `externalEventId`.
- Metrics:
  - `timeoff_request_created_total`
  - `timeoff_request_approval_failed_total`
  - `hcm_sync_latency_ms`
  - `hcm_sync_failures_total`
  - `reconciliation_drift_total`
- Alerts on repeated sync failure, negative balance projection, batch rejection spikes.

## Key Risks and Mitigations
- Race conditions on same balance key: use transactional updates + versioning.
- Replay/duplicate HCM events: strict idempotency store.
- Data drift after outages: scheduled reconciliation jobs.
- Ambiguous HCM semantics (delta vs absolute): normalize payload with explicit `updateType`.
