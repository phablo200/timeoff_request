## TDD Implementation Plan (Execution Order)

### 1. Foundation Setup (Day 0)
1. Create module skeletons and test scaffolding:
   - `src/modules/timeoff-requests/*`
   - `src/modules/shared/domain/*` (state machine/invariants)
   - test helpers for SQLite reset + fixtures.
2. Configure test commands to run fast locally:
   - unit only
   - integration only
   - e2e only
3. Definition of Done:
   - test structure exists and runs green with placeholder specs.

### 2. Domain Core First (Red-Green-Refactor)
1. Write failing unit tests for:
   - valid/invalid status transitions
   - `availableDays >= 0` invariant
   - positive `days` validation
2. Implement minimal domain logic to pass.
3. Refactor into explicit policy classes (transition policy, balance policy).
4. DoD:
   - domain tests green
   - no controller logic required yet.

### 3. Phase 1: Time-Off Lifecycle + Local Consistency
1. Start with failing integration test:
   - approve `PENDING` with sufficient balance updates balance + ledger + sync event atomically.
2. Implement repository transaction + optimistic version check.
3. Add failing tests for:
   - insufficient balance
   - illegal transitions
   - concurrent approvals on same `employeeId+locationId` (no overspend).
4. Implement endpoints via e2e (in this order):
   - `POST /timeoff-requests`
   - `GET /timeoff-requests/:id`
   - approve/reject/cancel.
5. DoD:
   - all lifecycle tests green
   - concurrency test green
   - outbound sync record created on approve.

### 4. Phase 2: Realtime Sync + Idempotency
1. Write failing integration tests for realtime inbound:
   - absolute update applies correctly
   - delta update applies correctly
   - duplicate `externalEventId + payloadHash` ignored.
2. Implement realtime handler transaction + ledger append.
3. Write failing tests for API idempotency (`Idempotency-Key`):
   - same key + same fingerprint returns same response
   - same key + different payload returns conflict.
4. Implement idempotency store/middleware.
5. DoD:
   - duplicate protection proven for client writes + webhooks
   - no double-apply in balance/ledger.

### 5. Phase 3: Batch Sync + Reconciliation
1. Write failing integration tests for batch ingest:
   - chunked upsert
   - partial failure handling
   - checkpoint restart.
2. Implement staging + validation + reconciliation report.
3. Write failing tests for `POST /sync/hcm/reconcile/:employeeId/:locationId`:
   - HCM absolute overrides local
   - related local requests flagged.
4. DoD:
   - batch report includes inserted/updated/unchanged/rejected
   - reconcile endpoint heals drift deterministically.

### 6. Cross-Cutting Hardening
1. Add retry policy tests:
   - retry transient only (`timeout/429/5xx`)
   - no retry on functional 4xx.
2. Add observability assertions where practical:
   - correlation IDs propagated
   - sync event audit records persisted.
3. DoD:
   - failure modes from TRD covered by tests.

### 7. Coverage and Release Gates
1. Required pre-merge pipeline:
   - `yarn lint`
   - `yarn test`
   - `yarn test:e2e`
   - `yarn test:cov`
2. Coverage targets (recommended):
   - Domain/services: >= 90%
   - Repositories/sync flows: >= 80%
3. DoD:
   - all gates pass
   - TRD scenarios mapped to test cases.

---

## First 10 TDD Tests to Implement (Exact Order)
1. `should allow PENDING -> APPROVED transition`
2. `should reject APPROVED -> REJECTED transition`
3. `should reject approval when days <= 0`
4. `should reject approval when resulting balance would be negative`
5. `should approve and atomically decrement balance + append ledger + create sync event`
6. `should prevent overspend under concurrent approvals`
7. `should return ILLEGAL_STATUS_TRANSITION when approving non-PENDING request`
8. `should process realtime absolute balance update once`
9. `should dedupe duplicate realtime event by externalEventId+payloadHash`
10. `should replay same Idempotency-Key with identical response and reject payload mismatch`
