# Repository Guidelines

## Project Structure & Module Organization
This is a NestJS TypeScript service.
- `src/`: application code (`main.ts`, module, controller, service, and unit specs such as `app.controller.spec.ts`).
- `test/`: end-to-end tests and Jest e2e config (`app.e2e-spec.ts`, `jest-e2e.json`).
- `dist/`: compiled output from builds.
- Root config: `package.json`, `tsconfig*.json`, `eslint.config.mjs`, `.prettierrc`, `nest-cli.json`.

Keep feature logic grouped by module in `src/` (e.g., `users/users.module.ts`, `users/users.service.ts`).

## Build, Test, and Development Commands
Use Yarn (lockfile is `yarn.lock`).
- `yarn start:dev`: run in watch mode for local development.
- `yarn build`: compile TypeScript to `dist/`.
- `yarn start:prod`: run compiled app from `dist/main`.
- `yarn lint`: run ESLint and auto-fix issues.
- `yarn format`: format `src/**/*.ts` and `test/**/*.ts` with Prettier.
- `yarn test`: run unit tests.
- `yarn test:e2e`: run end-to-end tests.
- `yarn test:cov`: generate coverage report in `coverage/`.

## Coding Style & Naming Conventions
- Language: TypeScript with 2-space indentation and semicolon-preferred formatting via Prettier.
- Follow NestJS naming: `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- Class names: PascalCase (`AppController`); methods/variables: camelCase.
- Test files: `*.spec.ts`; keep unit tests close to source when practical.
- Run `yarn lint && yarn format` before opening a PR.

## Testing Guidelines
- Frameworks: Jest + `ts-jest`; e2e uses Supertest.
- Unit test pattern: `src/**/*.spec.ts`.
- E2E test pattern: `test/**/*.e2e-spec.ts`.
- Prefer behavior-focused test names (e.g., `should return health status`).
- Add or update tests for every functional change; verify with `yarn test` and `yarn test:e2e` for endpoint changes.

## Commit & Pull Request Guidelines
This repository currently has no commit history; adopt Conventional Commits from now on:
- `feat: add candidate search endpoint`
- `fix: handle empty salary input`
- `test: cover service validation branch`

PRs should include:
- Clear summary of behavior changes.
- Linked issue/ticket (if available).
- Test evidence (commands run and results).
- API example or response snippet when endpoints change.
