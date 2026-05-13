# Final Implementation Plan (Actionable Checklist)

## Objective
Complete the remaining production-grade scope for the Time-Off microservice:
- outbound HCM sync worker with retries and compensation
- persistent HCM mock for realistic e2e
- hardened batch/reconcile flows
- observability, idempotency hardening, migration/runtime hygiene
- full test/coverage evidence

## Delivery Order
1. Phase 1: Outbound Sync Engine
2. Phase 2: Persistent HCM Mock Server
3. Phase 3: Batch Pipeline Hardening
4. Phase 4: Reconciliation Hardening
5. Phase 6: Idempotency/Replay Hardening
6. Phase 5: Observability
7. Phase 7: DB/Runtime Hygiene
8. Phase 8: Test Completion & Evidence

---

## Phase 1: Outbound HCM Sync Worker (Critical Path)

### Tasks
- [ ] Extend schema for sync processing metadata
  - [ ] Update migration(s) under `src/persistence/migrations/`
  - [ ] Add fields to `sync_events`: `request_id`, `attempt_count`, `next_attempt_at`, `last_error`, `processed_at`
- [ ] Add domain statuses/markers as needed (`PENDING_SYNC` optional)
  - [ ] Update `src/modules/shared/domain/types.ts`
- [ ] Implement worker service
  - [ ] Create `src/modules/hcm-sync/outbound-sync.worker.ts`
  - [ ] Poll queued/retryable events and lock one event at a time
  - [ ] Apply retry policy with exponential backoff + jitter
- [ ] Implement HCM call path
  - [ ] Expand `src/modules/hcm-sync/hcm.client.ts`
  - [ ] Add typed error classification (transient vs functional)
- [ ] Implement request status transitions
  - [ ] Success: `APPROVED -> SYNCED`
  - [ ] Terminal failure: `APPROVED -> FAILED_SYNC` and optional `REVERSED`
  - [ ] Keep all state changes transactional in `timeoff-requests` flow

### Tests (TDD)
- [ ] `outbound-sync.worker.spec.ts`
  - [ ] retries transient failures and eventually syncs
  - [ ] does not retry functional 4xx
  - [ ] marks `FAILED_SYNC`/`REVERSED` on terminal failure
  - [ ] idempotent re-run does not double-consume

### Exit Criteria
- [ ] Sync worker processes queued events deterministically
- [ ] Retry/backoff behavior proven by tests
- [ ] Compensation path covered

---

## Phase 2: Persistent HCM Mock Server (E2E Backbone)

### Tasks
- [ ] Create dedicated mock module/server
  - [ ] `test/mocks/hcm-mock.server.ts` (or `scripts/hcm-mock.ts`)
  - [ ] Persistent in-memory or SQLite-backed state for balances
- [ ] Add mock endpoints
  - [ ] read balance by key
  - [ ] consume approved request
  - [ ] admin endpoint for out-of-band balance mutations
- [ ] Add behavior toggles
  - [ ] transient errors (timeout/429/5xx)
  - [ ] functional errors (`INVALID_DIMENSIONS`, `INSUFFICIENT_BALANCE`)
- [ ] Wire app to mock by env
  - [ ] `HCM_BASE_URL` in config

### Tests (TDD)
- [ ] e2e tests using mock server
  - [ ] happy-path outbound sync
  - [ ] transient retry then success
  - [ ] permanent failure + compensation
  - [ ] out-of-band HCM change and reconcile

### Exit Criteria
- [ ] E2E scenarios no longer rely on in-process stubs
- [ ] Mock behavior is deterministic and reusable

---

## Phase 3: Batch Pipeline Hardening

### Tasks
- [ ] Add batch job persistence
  - [ ] tables: `batch_jobs`, `batch_checkpoints`, `dead_letters`
  - [ ] migrations in `src/persistence/migrations/`
- [ ] Implement chunked processing
  - [ ] update `src/modules/hcm-sync/batch-sync.service.ts`
  - [ ] process rows in configurable chunk size
- [ ] Implement resume/restart
  - [ ] continue from last checkpoint
- [ ] Implement dead-letter storage
  - [ ] rejected row payload + reason
- [ ] Improve report contract
  - [ ] counts + checkpoint summary + rejection details

### Tests (TDD)
- [ ] `batch-sync.service.spec.ts`
  - [ ] partial failure resumes from checkpoint
  - [ ] duplicate batch replay ignored
  - [ ] dead-letter records are persisted correctly

### Exit Criteria
- [ ] Batch ingestion survives partial failures
- [ ] Operator can inspect failed records and restart safely

---

## Phase 4: Reconciliation Hardening

### Tasks
- [ ] Flag related local requests on drift
  - [ ] pending + approved-unsynced for same balance key
- [ ] Persist drift metadata
  - [ ] fields/table: `drift_events` with local/hcm delta and timestamps
- [ ] Add operator visibility endpoint(s)
  - [ ] e.g. `/sync/hcm/drift` or `/sync/hcm/reconcile/report`

### Tests (TDD)
- [ ] drift detection and flagging test
- [ ] no-op reconcile when already aligned
- [ ] operator report includes expected metadata

### Exit Criteria
- [ ] Drift is visible, auditable, and actionable

---

## Phase 5: Observability

### Tasks
- [ ] Structured logging integration
  - [ ] include `correlationId`, `requestId`, `externalEventId`, `syncEventId`
- [ ] Metrics instrumentation
  - [ ] `hcm_sync_latency_ms`
  - [ ] `hcm_sync_failures_total`
  - [ ] `reconciliation_drift_total`
  - [ ] `timeoff_request_approval_failed_total`
- [ ] Hook logs/metrics in sync + reconcile + approval flows

### Tests (TDD)
- [ ] metric emission tests on success/failure
- [ ] correlation propagation tests through request lifecycle

### Exit Criteria
- [ ] Core flows emit required telemetry consistently

---

## Phase 6: Idempotency/Replay Hardening

### Tasks
- [ ] Implement canonical fingerprinting
  - [ ] create `src/modules/idempotency/fingerprint.ts`
  - [ ] stable sorted JSON representation
- [ ] Add retention policy
  - [ ] add `expires_at` to idempotency table
  - [ ] cleanup job/service
- [ ] Enforce strict replay rules with canonicalized payload

### Tests (TDD)
- [ ] same semantic payload with different key order replays successfully
- [ ] mismatched canonical payload conflicts
- [ ] expired record is ignored and recreated

### Exit Criteria
- [ ] Idempotency is robust and storage is bounded

---

## Phase 7: DB/Runtime Hygiene

### Tasks
- [ ] Introduce schema version tracking
  - [ ] table: `schema_migrations`
  - [ ] migration runner executes pending scripts in order
- [ ] Add config module + env validation
  - [ ] `DB_PATH`, `HCM_BASE_URL`, `SYNC_WORKER_INTERVAL_MS`, `IDEMPOTENCY_TTL_SEC`
- [ ] Persistent local DB config support
  - [ ] default development path (not only `:memory:`)

### Tests (TDD)
- [ ] migration runner idempotency test
- [ ] invalid config fails startup test

### Exit Criteria
- [ ] Reliable startup and repeatable schema evolution

---

## Phase 8: Test Completion and Evidence

### Tasks
- [ ] Stabilize and run local e2e suite
  - [ ] `yarn test:e2e --runInBand`
- [ ] Produce coverage evidence
  - [ ] `yarn test:cov`
  - [ ] add coverage summary in docs (e.g. `.workspace/coverage-evidence.md`)
- [ ] Validate full quality gate
  - [ ] `yarn lint`
  - [ ] `yarn test --runInBand`
  - [ ] `yarn test:e2e --runInBand`
  - [ ] `yarn test:cov`

### Exit Criteria
- [ ] All test suites pass locally
- [ ] Coverage evidence captured for deliverables
- [ ] Outbound retry + compensation paths explicitly verified

---

## Suggested File Additions/Updates (Summary)
- `src/persistence/migrations/*.sql`
- `src/persistence/migration-runner.ts` (optional)
- `src/modules/hcm-sync/outbound-sync.worker.ts`
- `src/modules/hcm-sync/hcm.client.ts` (expanded)
- `src/modules/hcm-sync/batch-sync.service.ts` (hardened)
- `src/modules/hcm-sync/sync.controller.ts` (drift/report endpoints)
- `src/modules/idempotency/fingerprint.ts`
- `src/modules/idempotency/idempotency.service.ts` (TTL-aware)
- `test/mocks/hcm-mock.server.ts`
- `test/**/*.e2e-spec.ts` expansions
- `.workspace/coverage-evidence.md`
