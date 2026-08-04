# TailorHub Backend

Backend API for the TailorHub SaaS platform built with NestJS and TypeORM.

## Requirements

- Node.js 22+
- npm 10+
- PostgreSQL 15+

## Install

```bash
npm ci
```

## Environment setup

Create a local `.env` file based on `.env.example` and set at least:

```env
DATABASE_URL=
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=tailorhub
JWT_SECRET=replace-with-a-strong-secret
PORT=3000
NODE_ENV=development
```

When you want to use Render DB, set `DATABASE_URL` with the Render connection string.
When `DATABASE_URL` is empty, the app uses local fallback values (`DB_HOST`, `DB_PORT`, etc.).

## Local PostgreSQL with Docker

Start local database:

```bash
npm run db:up
```

See logs:

```bash
npm run db:logs
```

Stop containers:

```bash
npm run db:down
```

## Run locally

```bash
npm run start:dev
```

If startup fails with `ECONNREFUSED`, PostgreSQL is not reachable with your `DATABASE_URL`.

## Swagger for frontend integration

Swagger UI is available at:

- `http://localhost:3000/docs`

OpenAPI JSON is available at:

- `http://localhost:3000/docs-json`

### Authentication flow

1. Call `POST /api/auth/login`.
2. Copy `accessToken` from response.
3. In Swagger UI, click `Authorize` and paste the token value.
4. In frontend code, send header:

```http
Authorization: Bearer <accessToken>
```

### Pagination contract

List endpoints use query params:

- `page` (default `1`)
- `limit` (default `10`, max `100`)

Paginated responses include:

- `data`: array of items
- `meta.page`
- `meta.limit`
- `meta.totalItems`
- `meta.totalPages`

### Common HTTP responses

- `400`: validation or business rule errors
- `401`: missing/invalid JWT
- `403`: permission or cross-store access denied
- `404`: resource not found

### Frontend recommendation

Generate typed client models from `docs-json` (OpenAPI) so request/response contracts stay synchronized with backend DTOs.

Recommended local flow before pushing:

1. `npm run db:up`
2. Ensure local `.env` has `DATABASE_URL=` empty and local DB vars set.
3. `npm run start:dev`
4. `npm run test:ci`

## Testing and coverage

```bash
npm run test:ci
```

This command:

- Runs unit tests in CI mode.
- Prints coverage percentages in the console.
- Enforces a strict global policy of **100%** for:
  - Statements
  - Branches
  - Functions
  - Lines

If any metric drops below 100%, the command exits with error code 1.

## CI workflow

GitHub Actions workflow: `.github/workflows/ci.yml`

It runs on pushes and pull requests, executes `npm run test:ci`, and uploads the coverage artifact.

## Branch protection

Branch protection setup guide: `.github/BRANCH_PROTECTION.md`

Recommended required status check:

- `Test and Coverage`

## Useful scripts

```bash
npm run build
npm run lint
npm run test
npm run test:ci
npm run test:e2e
```
