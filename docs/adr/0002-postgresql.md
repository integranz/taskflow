# ADR 0002: PostgreSQL via node-postgres

- Status: accepted
- Date: 2026-09-17
- Supersedes: in-memory `Map` store from the initial skeleton

## Context

ADR 0001 named PostgreSQL as the system of record. The bootstrap kept data in memory so HTTP tests could run. Persistence was requested next. Hosting files stay out of the tree.

## Decision

- Use `pg` (node-postgres) with `DATABASE_URL`. No ORM.
- Schema: `lists` and `tasks` (`tasks.list_id` FK, `ON DELETE CASCADE`). IDs are database UUIDs.
- Calendar due dates are Postgres `date`, returned as `YYYY-MM-DD` strings (custom type parser, so they are not shifted by JS `Date`).
- HTTP handlers talk only to a `Store`. SQL lives under `src/db/`.
- Apply `src/db/schema.sql` on process start and in test setup.
- Tests require a reachable database (`taskflow_test` by convention) and `TRUNCATE` between cases. No in-memory fallback.
- Operators provide Postgres themselves (local install or a one-off container). This repo does not add Compose or cloud manifests.

## Consequences

- `npm test` fails if Postgres is down.
- The in-memory store is gone; there is one write path.
