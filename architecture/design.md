# Design

## Purpose

taskflow is a small HTTP API that lets each registered person keep named lists of tasks with optional due dates.

## Resources

```
GET    /health                                                        public

POST   /auth/register        { "email": string, "password": string }  → 201 { user, token, expiresAt }
POST   /auth/login           { "email": string, "password": string }  → 200 { user, token, expiresAt }
POST   /auth/logout          Bearer                                   → 204
GET    /auth/me              Bearer                                   → 200 { user }
PATCH  /auth/password        Bearer { "currentPassword", "newPassword" } → 204 (other sessions revoked)

GET    /lists                Bearer                                   → { lists }
POST   /lists                Bearer { "name": string }                → 201 { list }
GET    /lists/:listId        Bearer                                   → { list, tasks }
PATCH  /lists/:listId        Bearer { "name": string }                → { list }
DELETE /lists/:listId        Bearer                                   → 204 (tasks cascade)
POST   /lists/:listId/tasks  Bearer { "title": string, "dueDate"?: string | null } → 201 { task }
PATCH  /tasks/:taskId        Bearer { "title"?, "dueDate"?, "done"?: boolean }     → { task }
DELETE /tasks/:taskId        Bearer                                   → 204
```

Bearer routes answer `401 {"error":"unauthorized"}` without a valid session. Rows owned by someone else are `404`. Malformed JSON is `400 {"error":"invalid json"}`; any NUL character in a JSON string is `400`; bodies over 64 KiB are `413 {"error":"request body too large"}`; malformed UUIDs are `404`. `dueDate` must be a real calendar date (`2026-02-30` is `400`).

JSON uses camelCase. Due dates are ISO-8601 calendar dates (`YYYY-MM-DD`); `createdAt` and `expiresAt` are ISO-8601 timestamps. `user` is `{ id, email, createdAt }` and never includes the password hash.

## Runtime

```
HTTP (src/app.ts → src/routes/auth.ts, src/routes/lists.ts; helpers in src/http.ts)
  → auth (src/auth: scrypt password hashes, opaque session tokens)
  → Store (src/db/store.ts)
    → Postgres via pg (src/db/pg-store.ts, DATABASE_URL)
```

- Schema: `src/db/schema.sql` — `users`, `sessions` (`user_id` FK, cascade), `lists` (`owner_id` FK, cascade), `tasks` (`list_id` FK, cascade). Applied idempotently on start and in test setup.
- Sessions store only the SHA-256 of the token; `SESSION_TTL_DAYS` (default 30) sets the lifetime.
- `GET /health` pings the database (`SELECT 1`) and returns `{ "status": "ok", "version" }`. `version` is the `VERSION` environment variable, or `0.0.0-local` when it is unset.
- Integration tests use a dedicated database (default `taskflow_test`) and truncate `users` and `lists` between cases. They fail if Postgres is unreachable.

## Boundaries

- No UI in this repository. The web UI is the separate `taskflow-app` repository (Next.js); it calls this API from its own server with a Bearer token.
- No background jobs until a due-date reminder is an explicit product request.
- No caching layer; Postgres and a single Node process are enough.
