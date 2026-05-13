# SQLite Transition Plan (TDD-First)

## Scope
Replace in-memory persistence with SQLite-backed repositories and real transactions to harden atomic approval, concurrency safety, and idempotency durability.

## Strategy
- Keep service/controller contracts stable.
- Swap persistence behind repository interfaces.
- Drive implementation with failing integration tests on SQLite.
- Preserve existing unit tests for domain rules.

## Phase 1: Database Foundation

### 1.1 Schema and Migrations
Create SQL migrations for:
- `balances`
  - `employee_id`, `location_id`, `available_days`, `version`, `updated_at`, `last_synced_at`
  - unique key: `(employee_id, location_id)`
- `time_off_requests`
  - `id`, `employee_id`, `location_id`, `days`, `reason`, `status`, `created_at`, `updated_at`
- `balance_ledger`
  - `id`, `balance_key`, `type`, `days`, `request_id`, `source`, `created_at`
- `sync_events`
  - `id`, `direction`, `external_event_id`, `payload_hash`, `status`, `error`, `created_at`
  - dedupe index: `(external_event_id, payload_hash, direction)`
- `idempotency_records`
  - `key`, `fingerprint`, `response_body`, `status_code`, `created_at`

### 1.2 Constraints
- `balances.available_days >= 0` check constraint.
- `time_off_requests.status` constrained to valid enum values.
- foreign key from `balance_ledger.request_id` to `time_off_requests.id` (nullable).

### TDD Gate
- Failing migration test: schema boots cleanly on fresh DB.
- Failing constraint tests: invalid inserts are rejected.

## Phase 2: Repository Swap (In-Memory -> SQLite)

### 2.1 Introduce Persistence Ports
- Keep current repository method signatures.
- Add SQL-backed implementations and DI wiring.

### 2.2 Replace Modules
- `BalancesRepository` -> SQL implementation.
- `TimeOffRequestsRepository` -> SQL implementation.
- Idempotency store -> SQL implementation.
- Realtime dedupe state -> `sync_events` backed checks.

### TDD Gate
- Existing service tests remain green (or adapted with test DB harness).
- New integration tests prove repository behavior parity.

## Phase 3: Transactional Approval with Optimistic Concurrency

### 3.1 Single Transaction Flow (`approve`)
Within one SQL transaction:
1. Read request row and validate `PENDING` transition.
2. Read balance row for `employee_id + location_id`.
3. Validate sufficient balance.
4. Update balance using optimistic version condition (`WHERE version = ?`).
5. Update request status to `APPROVED`.
6. Insert `balance_ledger` reservation entry.
7. Insert outbound `sync_events` row (`QUEUED`).
8. Commit.

### 3.2 Conflict Handling
- If optimistic update affects 0 rows, retry bounded times.
- On exhausted retries, return domain `CONFLICT`.

### TDD Gate
- Concurrent approval integration test: one succeeds, one fails, balance never negative.
- Atomicity integration test: simulated failure rolls back all writes.

## Phase 4: Test Suite Migration to SQLite Integration

### 4.1 Test Harness
- Add helper to create isolated SQLite DB per suite (or per test file).
- Run migrations in setup.
- Truncate tables between tests.

### 4.2 Port Existing Tests
- Convert current service persistence-sensitive tests to integration specs.
- Keep pure domain tests as unit tests.

### 4.3 Add Durability Cases
- Idempotency replay survives process restart (new app instance, same DB).
- Realtime dedupe survives restart.

### TDD Gate
- Integration suite passes against SQLite only.
- No in-memory-only behavior remains in critical flows.

## Phase 5: Verification Gate Before Batch/Reconcile

### 5.1 Required Commands
- `yarn lint`
- `yarn test --runInBand`
- `yarn test:e2e --runInBand` (in unrestricted/local environment)
- `yarn test:cov`

### 5.2 Acceptance Criteria
- Approval path is transactionally atomic.
- Concurrency race on same balance key is deterministic and safe.
- Idempotency and dedupe are persisted and durable.
- Build passes and critical test paths are green.

## Suggested Deliverable Order
1. Migration files + schema validation tests.
2. SQL repository implementations + wiring.
3. Transactional `approve` implementation.
4. Integration test migration and hardening.
5. Full validation run and checklist sign-off.
