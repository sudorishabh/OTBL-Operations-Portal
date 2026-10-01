# OTBL Operations Portal

The operations portal for **ONGC TERI Biotech Limited (OTBL)**. It tracks remediation work on oil-contaminated land (oil zapping and bioremediation) through the whole lifecycle:

**client → proposal → work order → sites → field uploads → expenses → completion**

- **Admins** create offices, users, clients, proposals and work orders, and approve or cancel them.
- **Office Managers and Office Operators** run their assigned offices: sites, activity quantities, expenses and documents.
- **Site Operators** use the app on a phone to upload photos, measurement sheets and bills from their assigned sites.
- **Viewers** get read-only access to everything.

Your role decides what you can do; your office or site assignment decides what you can see. The full operating guide, step by step for every role, is in [docs/SOP.md](docs/SOP.md). The workflow diagram is in [docs/flow-diagram.md](docs/flow-diagram.md).

---

## Repository layout

A Turborepo + pnpm monorepo.

| Path | Package | What it is |
| --- | --- | --- |
| `apps/web` | `web` | Next.js frontend (App Router). Runs on port **3000**. |
| `apps/server` | `server` | Express server that hosts the tRPC API. Runs on port **7200**. |
| `packages/trpc` | `@pkg/trpc` | tRPC routers and business logic, including the SharePoint document integration. |
| `packages/db` | `@pkg/db` | Drizzle ORM schema, MySQL connection, and migrations. |
| `packages/schema` | `@pkg/schema` | Zod validation schemas shared by web and API. |
| `packages/utils` | `@pkg/utils` | Shared helpers (auth/JWT, password hashing, dates). |
| `packages/ui` | `@repo/ui` | Starter component library (not currently used by `web`). |
| `packages/eslint-config` | `@repo/eslint-config` | Shared ESLint config. |
| `packages/typescript-config` | `@repo/typescript-config` | Shared `tsconfig` bases. |
| `docs/` | | SOP and workflow diagram. |

## Tech stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Radix UI, TanStack Query, React Hook Form
- **API:** tRPC 11 on Express 5, JWT auth, Helmet, rate limiting
- **Database:** MySQL with Drizzle ORM
- **Validation:** Zod 4
- **File storage:** SharePoint (Microsoft Graph)

---

## Getting started

### Prerequisites

- **Node.js 20.9+** (required by Next.js 16)
- **pnpm 10**. The version is pinned in `package.json`, so `corepack enable` will pick it up.
- A **MySQL** database you can reach

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create the env files

There is no `.env.example`, so create these files by hand.

**`apps/server/.env`**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | | MySQL connection string, e.g. `mysql://user:pass@localhost:3306/otbl` |
| `WEB_CLIENT` | yes | | Web app origin allowed by CORS, e.g. `http://localhost:3000` |
| `MOBILE_CLIENT` | yes | | Second allowed CORS origin |
| `JWT_SECRET` | yes | | Access-token signing secret |
| `JWT_REFRESH_SECRET` | yes | | Refresh-token signing secret |
| `JWT_RESET_PASSWORD_SECRET` | yes | | Password-reset token secret |
| `SHAREPOINT_TENANT_ID` | yes | | Azure AD tenant for document storage |
| `SHAREPOINT_CLIENT_ID` | yes | | Azure AD app (client) ID |
| `SHAREPOINT_CLIENT_SECRET` | yes | | Azure AD app secret |
| `SHAREPOINT_SITE_URL` | yes | | SharePoint site that holds the documents |
| `PORT` | no | `7200` | API port |
| `JWT_EXPIRATION` | no | `30m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRATION` | no | `7d` | Refresh-token lifetime |
| `JWT_RESET_PASSWORD_EXPIRATION` | no | `1h` | Reset-token lifetime |
| `TRUST_PROXY` | no | `false` | Proxy hop count (e.g. `1`) or trusted IPs when running behind a reverse proxy |
| `RATE_LIMIT_ENABLED` | no | `true` | Turn API rate limiting on or off |
| `RATE_LIMIT_GENERAL_WINDOW_MS` | no | `60000` | Rate-limit window |
| `RATE_LIMIT_GENERAL_MAX` | no | `200` | Requests per window |
| `RATE_LIMIT_SENSITIVE_MAX` | no | `10` | Limit for sensitive routes |
| `RATE_LIMIT_LOGIN_ACCOUNT_MAX` | no | `5` | Login attempts per account |

**`apps/web/.env`**

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | no | API base URL. Leave it empty to call `/trpc` on the same origin; Next.js then proxies those calls to `TRPC_REWRITE_TARGET`. |
| `TRPC_REWRITE_TARGET` | no | Where the `/trpc` proxy points. Defaults to `http://127.0.0.1:7200`. |

### 3. Build the shared packages

`web` and `server` import the compiled `dist/` output of the `@pkg/*` packages, so build those packages before the first run:

```bash
pnpm --filter "./packages/*" build
```

Rebuild a package whenever you change it, e.g. `pnpm --filter @pkg/trpc build`.

### 4. Set up the database

```bash
pnpm --filter @pkg/db db:migrate
```

Drizzle reads `DATABASE_URL` from `apps/server/.env`.

### 5. Run

```bash
pnpm dev
```

This starts the web app on <http://localhost:3000> and the API on <http://localhost:7200>.

---

## Scripts

Run these from the repo root:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run web and server in watch mode |
| `pnpm build` | Build every package and app |
| `pnpm lint` | Lint everything |
| `pnpm check-types` | Type-check packages that define a `check-types` script |
| `pnpm format` | Format `.ts`, `.tsx` and `.md` files with Prettier |

Database commands are run through the `@pkg/db` package:

| Command | What it does |
| --- | --- |
| `pnpm --filter @pkg/db db:generate` | Generate a migration after editing `packages/db/src/schema.ts` |
| `pnpm --filter @pkg/db db:migrate` | Apply pending migrations |
| `pnpm --filter @pkg/db db:studio` | Open Drizzle Studio to browse the data |

Migrations are in `packages/db/migrations`. One-off SQL scripts for data changes are in `packages/db/scripts`.

---

## Deployment (Docker)

```bash
docker compose up --build
```

This builds and runs two containers:

- `server`: port 7200, configured from `apps/server/.env`
- `web`: port 3000

Next.js reads its proxy target when the image is built. If the browser reaches the API through the web app's `/trpc` proxy, set `TRPC_REWRITE_TARGET=http://server:7200` at web build time so the proxy points at the `server` container.
