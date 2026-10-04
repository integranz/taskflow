# ADR 0004: Accounts and sessions

- Status: accepted
- Date: 2026-10-04
- Supersedes: constitution item 1 ("Single-user. No accounts"); the "Auth" entry in the `CONTEXT.md` non-goals

## Context

The user asked (2026-09-27) for a web UI in the separate `taskflow-app` repository (Next.js) and, explicitly, for real accounts so that several people can use the API with their own lists. Constitution item 1 allowed this only with a new ADR and an explicit user request; both now exist. The UI calls this API from its own server and keeps the token in an httpOnly cookie, so this API needs no CORS handling.

## Decision

- Open self-registration with email and password (`POST /auth/register`). Emails are trimmed, lowercased and unique.
- Passwords are hashed with Node's built-in `crypto.scrypt` (N=32768, r=8, p=1, 16-byte salt, 64-byte key). The parameters are stored with each hash so they can be raised later. No new dependency.
- Sessions live in the database (`sessions` table). The client receives a random 32-byte opaque token once; only its SHA-256 hash is stored. Tokens travel as `Authorization: Bearer <token>`, expire after `SESSION_TTL_DAYS` (default 30) and are revoked by `POST /auth/logout`. Changing the password revokes every other session.
- Every list belongs to one user (`lists.owner_id`). The column is a nullable FK so the idempotent `schema.sql` still applies to existing data. All `/lists` and `/tasks` routes require a valid session and see only the caller's rows; anything else is `404`.
- New routes: `PATCH /lists/:id` (rename), `DELETE /lists/:id`, `DELETE /tasks/:id`, and `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/password`.
- HTTP handling is split into `src/http.ts` (helpers), `src/routes/auth.ts` and `src/routes/lists.ts`; `src/app.ts` dispatches. Malformed JSON is `400 {"error":"invalid json"}`; malformed UUIDs are `404`, not `500`.
- Out of scope by decision: roles or admin screens, OAuth or social login, password-reset email, email verification, rate limiting or lockout, CORS headers, sharing lists between users.

## Consequences

- Rows that existed before this change have `owner_id = NULL` and are invisible to everyone until an operator assigns them.
- Tests register a user first; `tests/setup.ts` truncates `users` and `lists`.
- `version.json` moves to `0.2`. No new secrets, required environment variables or Terraform changes (`SESSION_TTL_DAYS` is optional).
- Clients must keep the token secret. The web UI stores it in an httpOnly, SameSite=Lax cookie on its own origin and never exposes it to the browser.
