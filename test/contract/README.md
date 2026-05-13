# HCM Contract Tests

These tests define and protect the integration contract between ExampleHR and HCM.

## Scope

- `GET /balances/:employeeId/:locationId`
- `POST /timeoff/consume`
- `POST /admin/balances/upsert`
- `POST /admin/failure-mode`

## Status Semantics Covered

- `GET /balances/:employeeId/:locationId`
  - `200` with `{ days: number }` for known dimensions
  - `404` with `{ code: 'INVALID_DIMENSIONS' }` for unknown dimensions
  - `503` with `{ code: 'HCM_UNAVAILABLE' }` when failure mode is transient
- `POST /timeoff/consume`
  - `200` with `{ ok: true }` for valid consume
  - `400` with `{ code: 'INVALID_DIMENSIONS' }` for invalid payload
  - `422` with `{ code: 'INSUFFICIENT_BALANCE' }` for functional business failure
  - `503` with `{ code: 'HCM_UNAVAILABLE' }` in transient mode
- `POST /admin/balances/upsert`
  - `200` with `{ ok: true }` for valid payload
  - `400` with `{ code: 'INVALID_DIMENSIONS' }` for invalid payload
- `POST /admin/failure-mode`
  - `200` with `{ ok: true, mode }` for `none|transient|functional`
  - `400` with `{ code: 'INVALID_MODE' }` for invalid mode

## Suites

- `hcm-client.contract.spec.ts`: consumer contract for `HcmClient` behavior.
- `hcm-mock-provider.contract.spec.ts`: provider contract for mock endpoint behavior.

## Deterministic Harness

Each test file:
- starts its own isolated mock server process on a dedicated port;
- calls `/admin/reset` in `beforeEach`;
- seeds balances using `/admin/balances/upsert`.

## Run

```bash
yarn test:contract
```

Watch mode:

```bash
yarn test:contract:watch
```

## Contract Change Checklist

- Update contract tests before changing integration behavior.
- Update mock and `HcmClient` in the same change when contract changes.
- Mark breaking changes explicitly in PR description and migration notes.
