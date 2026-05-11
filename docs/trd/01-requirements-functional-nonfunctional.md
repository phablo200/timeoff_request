# Functional and Non-Functional Requirements

## Functional Requirements
- Create, read, cancel, approve, and reject time-off requests.
- Compute and expose current balance snapshot by employee/location.
- Validate request amount before approval with defensive local checks.
- Push approved usage to HCM real-time endpoint.
- Ingest HCM real-time balance events (delta or absolute).
- Ingest HCM batch corpus and reconcile local projections.
- Keep immutable audit trail for lifecycle transitions and sync events.

## Business Rules
- Balances are scoped to `employeeId + locationId`.
- Request amount must be positive and use canonical unit (`days`).
- Only `PENDING` requests can be approved/rejected/cancelled.
- Approval reserves/consumes balance atomically in local transaction.
- HCM rejection or conflict triggers compensating transition (`FAILED_SYNC` or `REVERSED`).

## Non-Functional Requirements
- Availability target: 99.9% for read APIs.
- Idempotency for write endpoints and HCM webhook ingestion.
- Concurrency safety for same employee/location updates.
- Full observability: structured logs, request IDs, sync correlation IDs.
- SQLite-backed persistence for challenge scope.
