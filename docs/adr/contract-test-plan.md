# Contract Test Plan

## Goal
Add dedicated contract tests for HCM integration under `test/contract/`, since this folder is currently only a placeholder.

## 1. Define Contract Scope
- Lock the HCM interactions this service depends on:
  - `GET /balances/:employeeId/:locationId`
  - `POST /timeoff/consume`
  - `POST /admin/balances/upsert`
  - `POST /admin/failure-mode`
- Document request/response shape and status semantics (`200`, `404`, `422`, `503`, etc.) in `test/contract/README.md`.

## 2. Choose Test Style and Structure
- Start with consumer-side contract tests against the running HCM mock server.
- Create:
  - `test/contract/hcm-client.contract.spec.ts` (consumer expectations of `HcmClient`)
  - `test/contract/hcm-mock-provider.contract.spec.ts` (provider behavior of mock endpoints)

## 3. Add Deterministic Harness
- In each spec `beforeEach`, reset mock state via `/admin/reset`.
- Seed balances via `/admin/balances/upsert`.
- Run with explicit `HCM_BASE_URL` targeting the mock server.

## 4. Consumer Contract Cases (`HcmClient`)
- `getBalance` contract:
  - `200` -> returns number
  - `404` -> returns `undefined`
  - `503`/`5xx` -> returns `null`
- `submitApprovedUsage` contract:
  - success -> returns `{ ok: true }`
  - transient failures -> throws with `kind = 'TRANSIENT'`
  - functional failures -> throws with `kind = 'FUNCTIONAL'`

## 5. Provider Contract Cases (Mock Server)
- Validate endpoint behavior for valid and invalid payloads plus each failure mode.
- Assert exact status codes and minimum required response fields (`code`, `days`, `ok`).

## 6. Reusable Test Helpers
- Add helpers in `test/contract/helpers` for payload builders and common assertions.
- Keep specs focused on behavior, not setup duplication.

## 7. Scripts and Execution
- Add scripts in `package.json`:
  - `test:contract`
  - optional `test:contract:watch`
- Update `README.md` with how to start/reset mock and run contract tests.

## 8. Change Guardrails
- Add a short checklist to `test/contract/README.md`:
  - update contract tests before integration behavior changes
  - update mock + `HcmClient` together when contract changes
  - explicitly mark and communicate breaking changes
