# Log Trace Implementation Plan

## 1. Define Trace Contract
- Standardize IDs: `correlationId`, `requestId`, optional `externalEventId`.
- Define header policy:
  - Accept inbound `x-correlation-id`.
  - Always generate `x-request-id`.
  - Echo both in response headers.

## 2. Add Request Context Infrastructure
- Create `RequestContextService` using `AsyncLocalStorage`.
- Expose `get()`, `run()`, `setExternalEventId()` helpers.

## 3. Wire HTTP Entrypoint
- Add global Nest interceptor (or middleware) that:
  - Reads/creates IDs.
  - Wraps handler execution in context.
  - Sets response headers.

## 4. Add Logging Abstraction
- Create `AppLogger` wrapper over Nest `Logger`.
- Auto-enrich every log with context IDs from `RequestContextService`.
- Migrate high-value log points first:
  - `TimeOffRequestsService`
  - `BatchSyncService`
  - `OutboundSyncWorker`
  - `DomainErrorFilter`

## 5. Propagate into Async Worker Flows
- Persist correlation metadata on outbound sync events (DB column or metadata JSON).
- When worker processes event, rehydrate context before logging and HCM call.

## 6. Unify Error Logs
- Ensure `DomainErrorFilter` emits consistent JSON envelope with IDs.
- Include IDs in both logs and API error body (where appropriate).

## 7. Test Coverage
- Unit: context lifecycle and logger enrichment.
- E2E:
  - Request without headers generates IDs.
  - Request with `x-correlation-id` preserves it.
  - Response headers present.
  - Error response includes correlation ID.
- Integration: worker logs/operations carry correlation metadata.

## 8. Rollout Strategy
- Phase 1: HTTP context + error filter + minimal service logs.
- Phase 2: async propagation for outbound sync.
- Phase 3: widen adoption across remaining modules and clean legacy logs.
