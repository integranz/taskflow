# Coding-agent playbook

## Before editing

Read `CONTEXT.md` and `architecture/constitution.md`. If the request would violate an article, stop and say so.

## While editing

- Match existing HTTP style in `src/app.ts` until a router extraction is justified by size.
- Add or update a test in `tests/` for every route change.
- Do not format-churn unrelated files.

## After editing

- Run `npm test` and `npm run typecheck`.
- If you changed a product invariant, update `CONTEXT.md` and consider an ADR.

## Persistence

Postgres is live (`src/db/`, ADR 0002). Do not reintroduce an in-memory write path. Schema changes go in `src/db/schema.sql` and need a test that would fail without the new column/table.
