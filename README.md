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

## Deployment (Netlify + Render)

The frontend and backend are deployed separately, on different origins, so the
session cookie is sent cross-site (`SameSite=None; Secure`) in production —
this is handled automatically when `NODE_ENV=production`.

### Backend (Render)

`render.yaml` at the repo root is a Render Blueprint. In the Render dashboard:
New → Blueprint → point at this repo. It builds with
`npm install && npm run build -w server` and starts with
`node server/dist/index.js`. Set these environment variables when prompted
(same meaning as `server/.env.example`):

- `DATABASE_URL`, `DATABASE_URL_DIRECT` — your Neon connection strings
- `JWT_SECRET`
- `SEED_EMAIL`, `SEED_PASSWORD`
- `CORS_ORIGIN` — your Netlify site's URL(s), comma-separated (e.g.
  `https://expenseflow.netlify.app`)

Render sets `PORT` and `NODE_ENV=production` automatically for the web
service plan ordinarily, but `NODE_ENV` is pinned in the blueprint to make
sure cookie behavior is correct.

Run migrations/seed against the Render-configured database the same way as
local setup (`npm run db:migrate`, `npm run seed:user`), from your machine
with `server/.env` pointed at that database.

### Frontend (Netlify)

`netlify.toml` at the repo root configures the build: base directory
`client`, build command `cd .. && npm install && npm run build -w client`,
publish directory `client/dist`, plus an SPA redirect so client-side routes
don't 404 on refresh.

In Netlify's site settings, set:

- `VITE_API_URL` — your Render service's URL (e.g.
  `https://expense-flow-api.onrender.com`), no trailing slash

### Wiring it together

1. Deploy the backend first, note its Render URL.
2. Set `VITE_API_URL` on Netlify to that URL and deploy the frontend.
3. Set `CORS_ORIGIN` on Render to the Netlify URL and redeploy the backend.

## Notes

- All business logic (status rules, dashboard aggregation, amount changes) lives in Postgres functions under `db/functions`. Express routes are thin wrappers that validate input with zod and call a single function.
- There is intentionally no "copy from last year" feature — expenses stay active across years until you end them.
- "Current month" for status purposes is computed in the Asia/Kolkata time zone.
