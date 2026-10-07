# taskflow

REST API for lists, tasks, and due dates, with email + password accounts.

## Stack (locked)

- Runtime: Node.js 20+
- Language: TypeScript (strict, ESM)
- Data: PostgreSQL via `pg` and `DATABASE_URL`. SQL lives in `src/db/`. There is no in-memory store.
- API: JSON over HTTP (REST). No GraphQL, no tRPC.
- Auth: `node:crypto` scrypt password hashes; database sessions with opaque Bearer tokens (ADR 0004). No extra dependency.
- Tests: Vitest against a real HTTP server and a real Postgres database (`taskflow_test` by default).
- Hosting: slipway on Azure Container Apps (ADR 0003). App `api` at the repo root, stack `custom`, health `GET /health` includes `version`.

## Product invariants

- A **user** has a unique, lowercased email and a password of at least 8 characters.
- A **list** has a name and belongs to one user. Users only ever see their own lists and tasks.
- A **task** belongs to one list, has a title, optional due date, and a done flag.
- A **session** is an opaque Bearer token, stored hashed, that expires after `SESSION_TTL_DAYS` (default 30) or on logout.
- JSON field names are camelCase (`dueDate`, `listId`, `createdAt`).
- Errors are `{ "error": "<message>" }` with the matching 4xx/5xx status.

## Repo map

| Path | Role |
|------|------|
| `src/` | HTTP app (`app.ts` dispatch, `http.ts` helpers) |
| `src/routes/` | `auth.ts`, `lists.ts` route handlers |
| `src/auth/` | Password hashing, session tokens, Bearer parsing |
| `src/db/` | Pool, schema, Postgres `Store` |
| `tests/` | Vitest |
| `architecture/` | Design + constitution (source of truth for agents) |
| `docs/adr/` | Dated decisions |
| `docs/agents/` | How coding agents should work in this repo |
| `CONTEXT.md` | Living snapshot — keep in sync with reality |
| `AGENTS.md` / `CLAUDE.md` | Entry rules for coding agents |

## Non-goals

- Sharing lists between users, organisations/multi-tenancy, roles or admin screens, OAuth, password-reset email, rate limiting, mobile UI, compliance overlays.
