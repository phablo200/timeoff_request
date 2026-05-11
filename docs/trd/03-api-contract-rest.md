# API Contract (REST)

## Balance APIs
- `GET /balances/:employeeId/:locationId`
  - Returns current local projection and metadata (`version`, `lastSyncedAt`).

## Time-Off Request APIs
- `POST /timeoff-requests`
  - Body: `{ employeeId, locationId, days, reason? }`
  - Behavior: creates `PENDING` after shape validation.
- `GET /timeoff-requests/:id`
- `POST /timeoff-requests/:id/approve`
  - Requires manager context (assumed upstream auth).
  - Performs local defensive balance check and reservation/consumption.
- `POST /timeoff-requests/:id/reject`
- `POST /timeoff-requests/:id/cancel`

## Sync APIs
- `POST /sync/hcm/realtime/balance-updates`
  - Ingests realtime HCM event (absolute or delta amount).
  - Requires idempotency key (`externalEventId`).
- `POST /sync/hcm/batch/balances`
  - Ingests full corpus (stream or paged payload).
- `POST /sync/hcm/reconcile/:employeeId/:locationId`
  - On-demand compare-and-heal for one key.

## Error Contract
- Standard error envelope:
  - `{ code, message, details?, correlationId }`
- Representative codes:
  - `INVALID_DIMENSIONS`, `INSUFFICIENT_BALANCE`, `ILLEGAL_STATUS_TRANSITION`, `DUPLICATE_EVENT`, `HCM_UNAVAILABLE`.
