# Design

## Purpose

taskflow is a small HTTP API for a single person to keep named lists of tasks with optional due dates.

## Resources

```
GET    /health
GET    /lists
POST   /lists                  { "name": string }
GET    /lists/:listId          list + its tasks
POST   /lists/:listId/tasks    { "title": string, "dueDate"?: string | null }
PATCH  /tasks/:taskId          { "title"?: string, "dueDate"?: string | null, "done"?: boolean }
```

JSON uses camelCase. Dates are ISO-8601 calendar dates (`YYYY-MM-DD`) until an ADR introduces timestamps.

## Runtime

```
HTTP (src/app.ts)
  → Store (src/db/store.ts)
    → Postgres via pg (src/db/pg-store.ts, DATABASE_URL)
```

- Schema: `src/db/schema.sql` — `lists` and `tasks` (`tasks.list_id` FK, `ON DELETE CASCADE`).
- `GET /health` pings the database (`SELECT 1`) and returns `{ "status": "ok", "version" }`. `version` is the `VERSION` environment variable, or `0.0.0-local` when it is unset.
- Integration tests use a dedicated database (default `taskflow_test`) and truncate between cases. They fail if Postgres is unreachable.

## Boundaries

- No UI in this repository.
- No background jobs until a due-date reminder is an explicit product request.
- No caching layer; Postgres and a single Node process are enough.
