# API Samples

## Health / Metrics

### GET /metrics
```bash
curl -s http://localhost:3000/metrics
```

## Time-Off Requests

### POST /timeoff-requests
```bash
curl -s -X POST http://localhost:3000/timeoff-requests \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: req-001' \
  -d '{
    "employeeId": "emp-1",
    "locationId": "loc-1",
    "days": 2,
    "reason": "Vacation"
  }'
```

### GET /timeoff-requests
```bash
curl -s -X GET http://localhost:3000/timeoff-requests \
  -H 'Content-Type: application/json'
```

### GET /timeoff-requests/:id
```bash
curl -s http://localhost:3000/timeoff-requests/<REQUEST_ID>
```

### POST /timeoff-requests/:id/approve
```bash
curl -s -X POST http://localhost:3000/timeoff-requests/<REQUEST_ID>/approve
```

### POST /timeoff-requests/:id/reject
```bash
curl -s -X POST http://localhost:3000/timeoff-requests/<REQUEST_ID>/reject
```

### POST /timeoff-requests/:id/cancel
```bash
curl -s -X POST http://localhost:3000/timeoff-requests/<REQUEST_ID>/cancel
```

## Balances

### GET /balances/:employeeId/:locationId
```bash
curl -s http://localhost:3000/balances/emp-1/loc-1
```

## HCM Realtime Sync

### POST /sync/hcm/realtime/balance-updates
```bash
curl -s -X POST http://localhost:3000/sync/hcm/realtime/balance-updates \
  -H 'Content-Type: application/json' \
  -d '{
    "externalEventId": "evt-1001",
    "employeeId": "emp-1",
    "locationId": "loc-1",
    "updateType": "ABSOLUTE",
    "days": 10
  }'
```

Delta update example:
```bash
curl -s -X POST http://localhost:3000/sync/hcm/realtime/balance-updates \
  -H 'Content-Type: application/json' \
  -d '{
    "externalEventId": "evt-1002",
    "employeeId": "emp-1",
    "locationId": "loc-1",
    "updateType": "DELTA",
    "days": -1
  }'
```

## HCM Batch Sync

### POST /sync/hcm/batch/balances
```bash
curl -s -X POST http://localhost:3000/sync/hcm/batch/balances \
  -H 'Content-Type: application/json' \
  -d '{
    "jobId": "job-20260511-01",
    "checksum": "chk-abc-123",
    "balances": [
      { "employeeId": "emp-1", "locationId": "loc-1", "days": 12 },
      { "employeeId": "emp-2", "locationId": "loc-1", "days": 7 }
    ]
  }'
```

## Reconciliation / Drift

### POST /sync/hcm/reconcile/:employeeId/:locationId
```bash
curl -s -X POST http://localhost:3000/sync/hcm/reconcile/emp-1/loc-1
```

### GET /sync/hcm/drift
```bash
curl -s http://localhost:3000/sync/hcm/drift
```

## Outbound Sync Worker (Manual Trigger)

### POST /sync/hcm/outbound/process?limit=10
```bash
curl -s -X POST 'http://localhost:3000/sync/hcm/outbound/process?limit=10'
```
