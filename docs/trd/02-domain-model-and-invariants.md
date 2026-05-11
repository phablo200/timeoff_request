# Domain Model and Invariants

## Core Entities
- `Balance`: employee/location balance projection.
  - Fields: `employeeId`, `locationId`, `availableDays`, `version`, `updatedAt`.
- `TimeOffRequest`: requested time-off lifecycle.
  - Fields: `id`, `employeeId`, `locationId`, `days`, `status`, `reason`, `createdAt`, `updatedAt`.
- `BalanceLedgerEntry`: immutable event stream of local balance changes.
  - Fields: `id`, `balanceKey`, `type`, `days`, `requestId?`, `source`, `createdAt`.
- `SyncEvent`: inbound/outbound HCM interactions for idempotency/audit.
  - Fields: `id`, `direction`, `externalEventId`, `payloadHash`, `status`, `error?`.

## Request Statuses
`PENDING -> APPROVED -> SYNCED`
`PENDING -> REJECTED`
`PENDING -> CANCELLED`
`APPROVED -> FAILED_SYNC -> REVERSED` (if compensation applied)

## Invariants
- `availableDays >= 0` after every committed transaction.
- One transition per status edge; illegal transitions are rejected.
- Ledger is append-only.
- Sync events with same idempotency key are processed exactly once logically.
- Balance update requires optimistic version match (or transactional lock semantics).
