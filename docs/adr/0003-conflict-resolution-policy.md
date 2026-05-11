# ADR 0003: Conflict Resolution Policy

## Status
Accepted

## Context
HCM and local projection may diverge due to timing, retries, or out-of-band updates.

## Decision
When divergence is detected, HCM absolute balance overrides local projection. Related local requests are marked for reconciliation handling.

## Consequences
- Deterministic conflict outcome.
- Requires audit trail and operator visibility into reconciled requests.
- May trigger compensating entries for previously approved local actions.
