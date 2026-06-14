# Family Office (self-hosted)

A self-hosted platform for managing a family's wealth: net worth tracking,
investment portfolio, a document vault, and members with role-based access.
Your data stays on your own server.

> **Status: skeleton.** The architecture, data model, auth, and one fully
> worked module (Accounts / Net Worth) are in place. Other modules have working
> read endpoints and clearly marked `TODO`s where logic goes next.

## Stack

- **Monorepo** — pnpm workspaces (`apps/*`, `packages/*`)
- **API** — Express + TypeScript, Prisma ORM
- **Web** — React + Vite + TypeScript
- **Database** — PostgreSQL
- **Auth** — local accounts, bcrypt + JWT in an httpOnly cookie. Designed to
  add OIDC/SSO later without a rewrite (`User.oidcSubject` is reserved).
- **Deploy** — Docker Compose (db + api + web)

## Layout

```
apps/
  api/    Express backend
    prisma/schema.prisma   <- the domain model. Read this first.
    src/
      auth/                JWT + password helpers
      middleware/          authenticate, authorize (RBAC), audit, error
      modules/
        auth/              register / login / logout / me  (DONE)
        accounts/          net worth + valuations          (WORKED EXAMPLE)
        portfolio/         holdings + allocation            (perf = TODO)
        documents/         upload / list / download         (encryption = TODO)
        members/           list / create                    (invites = TODO)
  web/    React frontend (dashboard, portfolio, documents, members)
packages/
  shared/ TypeScript types shared by both ends
```

## Run with Docker (recommended)

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD and a strong JWT_SECRET
#   openssl rand -base64 48
docker compose up -d --build
```

Open http://localhost:8080. The first account you register becomes the **OWNER**;
registration is invite-only after that.

## Run locally (dev)

```bash
pnpm install
# start a Postgres (or: docker compose up -d db) and set DATABASE_URL in .env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev          # api on :4000, web on :5173
```

Seed login: `owner@example.com` / `changeme123`.

## The data model in one breath

Everything is scoped to a **Household**. Money lives in **Accounts** owned by a
**Member** (person) or an **Entity** (trust/company — model exists, UI is a later
module). **Valuation** snapshots drive net-worth-over-time; **Transactions** +
**Price** history drive portfolio performance. Every write should append an
**AuditLog** row.

## Where to go next

1. **Net-worth-over-time chart** — you already store `Valuation` snapshots; add a
   `GET /accounts/net-worth/history` endpoint and chart it.
2. **Portfolio performance** — TWR / IRR from transactions + prices.
3. **Document encryption at rest** — wrap file read/write in AES-256-GCM.
4. **Member invites** — create an INVITED `User` linked to a `Member`, email a
   one-time token.
5. **Multi-currency** — net worth currently assumes one currency; add FX.
6. **OIDC/SSO** — plug a second auth strategy alongside local accounts.

## Security notes

This handles sensitive financial and legal data. Before real use: enable HTTPS
(set `COOKIE_SECURE=true`), encrypt documents at rest, take regular encrypted
backups of the `db_data` and `doc_data` volumes, and keep registration locked.
