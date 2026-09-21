# taskflow

Personal REST API for lists, tasks, and due dates.

## Stack (locked)

- Runtime: Node.js 20+
- Language: TypeScript (strict, ESM)
- Data: PostgreSQL via `pg` and `DATABASE_URL`. SQL lives in `src/db/`. There is no in-memory store.
- API: JSON over HTTP (REST). No GraphQL, no tRPC.
- Tests: Vitest against a real HTTP server and a real Postgres database (`taskflow_test` by default).
- Hosting: none in-repo yet. Do not add Docker, Terraform, or cloud manifests unless asked.

## Product invariants

- A **list** has a name.
- A **task** belongs to one list, has a title, optional due date, and a done flag.
- JSON field names are camelCase (`dueDate`, `listId`).
- Errors are `{ "error": "<message>" }` with the matching 4xx/5xx status.

## Repo map

| Path | Role |
|------|------|
| `src/` | HTTP app |
| `src/db/` | Pool, schema, Postgres `Store` |
| `tests/` | Vitest |
| `architecture/` | Design + constitution (source of truth for agents) |
| `docs/adr/` | Dated decisions |
| `docs/agents/` | How coding agents should work in this repo |
| `CONTEXT.md` | Living snapshot — keep in sync with reality |
| `AGENTS.md` / `CLAUDE.md` | Entry rules for coding agents |

## Non-goals

- Auth, sharing, multi-tenancy, mobile UI, compliance overlays.
