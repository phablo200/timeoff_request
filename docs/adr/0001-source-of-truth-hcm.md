# ADR 0001: HCM as Source of Truth

## Status
Accepted

## Context
Time-off balances are changed by systems outside ExampleHR. Local data can drift.

## Decision
Treat HCM as authoritative for entitlement truth. ExampleHR maintains a local projection optimized for workflow and latency.

## Consequences
- Reconciliation logic is mandatory.
- Local UI can be fast, but must expose sync metadata.
- Conflict policy resolves to HCM absolute value.
