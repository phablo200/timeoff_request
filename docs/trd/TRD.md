# Technical Requirements Document (TRD)

## 1. Problem and Challenges

ExampleHR handles employee time-off requests, but HCM remains the source of truth for employment and entitlement balances. The core challenge is preserving balance integrity while two systems can update balances independently.

Primary challenges:
- Prevent approving requests that exceed available balance.
- Keep local state resilient when HCM is delayed, unavailable, or returns partial/ambiguous errors.
- Support both realtime HCM events and full batch balance snapshots.
- Guarantee idempotency and safe retries for write paths and webhook ingestion.
- Provide auditable decisions and traceability across request lifecycle and sync flows.

References:
- [00-context-and-goals.md](/home/danii/myProjects/challenges/example-hr/docs/trd/00-context-and-goals.md)
- [01-requirements-functional-nonfunctional.md](/home/danii/myProjects/challenges/example-hr/docs/trd/01-requirements-functional-nonfunctional.md)

## 2. Chosen Solution

### 2.1 Architectural Approach
- Build a NestJS microservice with SQLite persistence.
- Treat HCM as source of truth for external consistency while maintaining local transactional safeguards for user-facing responsiveness.
- Use local domain invariants plus async sync/reconciliation mechanisms to handle drift and outages.

### 2.2 Domain and Data Model
- `Balance` projection scoped by `employeeId + locationId`.
- `TimeOffRequest` lifecycle with explicit status transitions.
- Immutable `BalanceLedgerEntry` events for local balance mutations.
- `SyncEvent` records for inbound/outbound sync tracking, retries, and auditability.

### 2.3 API and Lifecycle
- REST endpoints for create/read/cancel/approve/reject time-off requests.
- Balance read endpoint for local projection.
- Realtime inbound sync endpoint for HCM balance updates.
- Batch ingestion endpoint for full corpus import with dedupe/checkpointing.
- Reconciliation endpoint to compare-and-heal one balance key against HCM.

### 2.4 Consistency, Reliability, and Error Strategy
- Defensive validation before transitions (`employeeId`, `locationId`, positive `days`, legal status edges).
- Atomic approval flow: validate balance, consume, persist request transition, append ledger, enqueue outbound sync event.
- Bounded exponential retry with jitter for transient external failures.
- Functional HCM failures produce compensating transitions (`FAILED_SYNC`/`REVERSED`) per policy.
- Idempotency key handling for client writes and dedupe semantics for sync events.

### 2.5 Observability
- Structured logs with `correlationId`, `requestId`, `externalEventId`.
- Metrics for request outcomes, HCM latency/failure, and reconciliation drift.
- Drift/event tracking tables for operational visibility and recovery workflows.

References:
- [02-domain-model-and-invariants.md](/home/danii/myProjects/challenges/example-hr/docs/trd/02-domain-model-and-invariants.md)
- [03-api-contract-rest.md](/home/danii/myProjects/challenges/example-hr/docs/trd/03-api-contract-rest.md)
- [04-sync-strategy-realtime-batch.md](/home/danii/myProjects/challenges/example-hr/docs/trd/04-sync-strategy-realtime-batch.md)
- [05-error-handling-idempotency-retries.md](/home/danii/myProjects/challenges/example-hr/docs/trd/05-error-handling-idempotency-retries.md)
- [07-rollout-observability-risks.md](/home/danii/myProjects/challenges/example-hr/docs/trd/07-rollout-observability-risks.md)

## 3. Alternatives Considered and Tradeoffs

### 3.1 Trust HCM Validation Only
- Pros: simpler local logic.
- Cons: poor UX latency and weaker resilience during HCM instability.
- Decision: rejected in favor of local defensive checks plus async sync.

### 3.2 Mandatory Queue Backbone
- Pros: strong decoupling and retry semantics.
- Cons: infrastructure overhead beyond challenge scope.
- Decision: deferred; DB-backed sync events used now, queue-ready later.

### 3.3 Sync-First Approval (block until HCM confirms)
- Pros: immediate external consistency.
- Cons: degraded manager UX under HCM latency/outages.
- Decision: rejected; local commit + asynchronous outbound sync chosen.

### 3.4 GraphQL-First API
- Pros: flexible query shape.
- Cons: added complexity for command-heavy lifecycle flows.
- Decision: REST-first for clarity and straightforward testability.

Reference:
- [06-alternatives-considered.md](/home/danii/myProjects/challenges/example-hr/docs/trd/06-alternatives-considered.md)

## 4. Deliverable Mapping

- Problem/challenges: covered in Section 1.
- Suggested solution: covered in Section 2.
- Alternatives/tradeoffs: covered in Section 3.
- Detailed requirements, contracts, and rollout risks: linked per section for deep dive.
