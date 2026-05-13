# ExampleHR Time-Off Microservice

NestJS + SQLite service for managing time-off request lifecycle while keeping balances synchronized with an HCM source of truth.

## Repository

- GitHub: https://github.com/phablo200/timeoff_request

## What It Does

- Manages time-off requests (`PENDING`, `APPROVED`, `SYNCED`, `REJECTED`, `CANCELLED`, `FAILED_SYNC`, `REVERSED`)
- Enforces local balance integrity (non-negative balances, guarded transitions)
- Records balance ledger entries for lifecycle and sync events
- Processes outbound HCM sync events asynchronously with retry/backoff
- Ingests realtime HCM updates with dedupe (`externalEventId + payloadHash`)
- Ingests HCM batch balance snapshots with job/checkpoint/dead-letter persistence
- Reconciles local balances against HCM absolute values and records drift events
- Supports API idempotency for write calls via `Idempotency-Key`
- Exposes Prometheus-style metrics endpoint

## Architecture Notes

- Persistence: SQLite via `better-sqlite3`
- Schema/migration bootstrap: `src/db/migrations/001_init.sql`
- Transaction boundary for approval flow: request status + balance update + ledger + sync event
- HCM behavior can be tested with the persistent mock server in `test/mocks/hcm-mock.server.ts`

## API Endpoints

### Time-Off Requests
- `POST /timeoff-requests`
- `GET /timeoff-requests/:id`
- `POST /timeoff-requests/:id/approve`
- `POST /timeoff-requests/:id/reject`
- `POST /timeoff-requests/:id/cancel`

### Balances
- `GET /balances/:employeeId/:locationId`

### HCM Sync
- `POST /sync/hcm/realtime/balance-updates`
- `POST /sync/hcm/batch/balances`
- `POST /sync/hcm/reconcile/:employeeId/:locationId`
- `GET /sync/hcm/drift`
- `POST /sync/hcm/outbound/process?limit=10`

### Observability
- `GET /metrics`

## Configuration

Environment variables:

- `DB_PATH` (default: `:memory:`)
- `HCM_BASE_URL` (optional; defaults to internal in-memory HCM client behavior)

Internal defaults (code constants in `src/config/defaults.ts`):
- `SYNC_WORKER_INTERVAL_MS = 5000`
- `SYNC_MAX_ATTEMPTS = 5`
- `IDEMPOTENCY_TTL_SEC = 86400`

Example local run with persistent DB:

```bash
env DB_PATH=./tmp/example-hr.sqlite yarn start:dev
```

## Setup

```bash
yarn install
```

## Run

```bash
# dev
yarn start:dev

# build
yarn build

# prod
yarn start:prod
```

## Test & Quality

```bash
# lint
yarn lint

# unit/integration-style specs
yarn test --runInBand

# e2e
yarn test:e2e --runInBand

# coverage
yarn test:cov
```

Mock HCM utility commands:

```bash
yarn hcm:mock:start
yarn hcm:mock:reset
```

Contract tests:

```bash
yarn test:contract
```

Contract details and guardrails are documented in `test/contract/README.md`.

## Current Status

Initial implementation is complete for the core lifecycle + sync flows.

Completed and passing locally in this workspace:
- `yarn lint`
- `yarn test --runInBand`
- `yarn test:cov`

Note: `yarn test:e2e --runInBand` may fail in restricted sandboxes due to socket bind permissions (`EPERM`).

## Documentation

### Technical Requirements
- [Context and Goals](docs/trd/00-context-and-goals.md)
- [Functional & Non-Functional Requirements](docs/trd/01-requirements-functional-nonfunctional.md)
- [Domain Model and Invariants](docs/trd/02-domain-model-and-invariants.md)
- [API Contract (REST)](docs/trd/03-api-contract-rest.md)
- [Sync Strategy: Realtime & Batch](docs/trd/04-sync-strategy-realtime-batch.md)
- [Error Handling, Idempotency & Retries](docs/trd/05-error-handling-idempotency-retries.md)
- [Alternatives Considered](docs/trd/06-alternatives-considered.md)
- [Rollout, Observability & Risks](docs/trd/07-rollout-observability-risks.md)

### Architecture Decision Records
- [ADR-0001: Source of Truth — HCM](docs/adr/0001-source-of-truth-hcm.md)
- [ADR-0002: Balance Reservation Strategy](docs/adr/0002-balance-reservation-strategy.md)
- [ADR-0003: Conflict Resolution Policy](docs/adr/0003-conflict-resolution-policy.md)
- [Contract Test Plan](docs/adr/contract-test-plan.md)

### Implementation Plans
- [Service Implementation](docs/plans/service-implementation.md)
- [Skeleton Plan](docs/plans/skeleton-plan.md)
- [SQLite Transition Plan](docs/plans/sqlite-transition-plan.md)
- [Log & Trace Implementation Plan](docs/plans/log-trace-implementation-plan.md)

### API Samples
- [curl samples](docs/samples.md)
