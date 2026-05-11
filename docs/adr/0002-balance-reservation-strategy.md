# ADR 0002: Balance Reservation on Approval

## Status
Accepted

## Context
Concurrent approvals for the same employee/location can overspend balance.

## Decision
On approval, perform atomic local balance decrement with optimistic version check and append ledger entry.

## Consequences
- Prevents oversubscription under concurrent writes.
- Requires retry path for version conflicts.
- Keeps approval UX responsive without waiting on HCM roundtrip.
