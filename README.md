# Expense Flow

A private, single-user web app that shows where your money goes each month.

## Stack

- `client/` — Vite, React, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, Recharts
- `server/` — Express, TypeScript, zod, pg (no ORM)
- `db/` — SQL migrations, functions, and seed scripts (Postgres on Neon)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the server env file and fill in real values:

   ```bash
   cp server/.env.example server/.env
   ```

   - `DATABASE_URL` — your Neon connection string (`sslmode=require`)
   - `DATABASE_URL_DIRECT` — optional, a direct/non-pooled connection string used for migrations if set
   - `JWT_SECRET` — a long random string
   - `SEED_EMAIL` / `SEED_PASSWORD` — credentials for the one user account
   - `CORS_ORIGIN` — allowed origin(s) for the client, comma-separated

3. Run migrations (creates tables and installs SQL functions):

   ```bash
   npm run db:migrate
   ```

4. Create the one user account from your seed credentials:

   ```bash
   npm run seed:user
   ```

5. (Optional) Seed starting expense data:

   ```bash
   npm run db:seed
   ```

6. Start both client and server in dev mode:

   ```bash
   npm run dev
   ```

   Client runs at http://localhost:5173, server at http://localhost:4000 (proxied under `/api`).

## Resetting your password

There is no email-based reset flow, since there is no public signup. Use the CLI instead:

```bash
npm run reset-password -- you@example.com new-password
```

## Tests

```bash
npm test
```

Runs the server test suite (Vitest), which covers the SQL functions' status rules and amount-change behaviour, plus auth and route tests.

## Notes

- All business logic (status rules, dashboard aggregation, amount changes) lives in Postgres functions under `db/functions`. Express routes are thin wrappers that validate input with zod and call a single function.
- There is intentionally no "copy from last year" feature — expenses stay active across years until you end them.
- "Current month" for status purposes is computed in the Asia/Kolkata time zone.
