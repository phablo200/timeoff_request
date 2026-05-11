# Sync Strategy (Realtime and Batch)

## Realtime Outbound (ExampleHR -> HCM)
- On approval, persist local transaction first and create outbound sync job/event.
- Execute HCM call with retry policy for transient failures.
- Mark request `SYNCED` on success.
- On terminal HCM failure, mark `FAILED_SYNC` and run compensation (`REVERSED`) if policy requires strict parity.

## Realtime Inbound (HCM -> ExampleHR)
- Validate payload shape and balance key dimensions.
- Deduplicate by `externalEventId` + payload hash.
- Apply update transactionally and append ledger record with `source=HCM_REALTIME`.

## Batch Inbound
- Accept batch snapshot for full corpus.
- Stage rows, validate dimensions, upsert balances in chunks.
- Produce reconciliation report: inserted, updated, unchanged, rejected.
- Batch job id and checksum stored for replay safety.

## Conflict Resolution Policy
- HCM wins on absolute balance truth.
- Local pending/approved-unsynced requests are flagged for reconciliation review.
- Any negative projected balance triggers alert and automated reconciliation attempt.
