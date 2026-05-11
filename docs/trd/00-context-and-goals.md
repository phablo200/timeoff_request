# Context and Goals

## Problem Statement
ExampleHR manages the time-off request workflow, while HCM is the system of record for employment and entitlement balances. Balance state can change outside ExampleHR (anniversary grants, yearly refresh, manual HCM operations). The service must prevent invalid requests and remain consistent with HCM.

## Goals
- Provide fast, deterministic APIs for time-off request lifecycle.
- Maintain balance integrity per `employeeId + locationId`.
- Support both real-time and batch sync from HCM.
- Be defensive when HCM validation is delayed, partial, or temporarily unavailable.
- Offer traceability for approvals, denials, and balance adjustments.

## Non-Goals
- Payroll, accrual policy authoring, or HR master data management.
- Replacing HCM as source of truth.
- Multi-tenant IAM design (assumed external auth gateway).

## Success Criteria
- No approved request exceeds validated available balance.
- Sync latency SLO: realtime updates visible within 5s (p95).
- Batch import reconciles full corpus without data loss.
- All external calls and decisions are auditable.
