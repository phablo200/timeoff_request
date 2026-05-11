# Alternatives Considered

## 1) Trust HCM Validation Only
- Pros: simpler local logic.
- Cons: poor UX latency and weak resilience if HCM validation is delayed or inconsistent.
- Decision: rejected; local defensive checks required.

## 2) Event-Driven Queue as Mandatory Backbone
- Pros: robust retry and decoupling.
- Cons: additional infrastructure complexity beyond challenge scope.
- Decision: deferred; model sync jobs/events in DB now, queue-ready later.

## 3) Strict Sync-First Approval (block until HCM confirms)
- Pros: strongest immediate external consistency.
- Cons: bad manager UX during HCM latency/outages.
- Decision: rejected; use local commit + async sync with explicit states.

## 4) GraphQL Instead of REST
- Pros: flexible query shape.
- Cons: unnecessary complexity for command-heavy lifecycle APIs.
- Decision: REST-first for clarity and testability.
