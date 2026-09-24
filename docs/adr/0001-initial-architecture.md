# ADR 0001: Initial architecture

- Status: accepted (hosting row superseded by ADR 0003)
- Date: 2026-09-17

## Context

New personal task API. The workspace started as a home-directory Cursor window with no product root. Architect’s interview produced a locked set of decisions so later agents do not re-litigate the stack.

## Decision

| Topic | Choice |
|-------|--------|
| Goal | Personal task API: lists, tasks, due dates |
| Language | TypeScript on Node.js 20+ |
| Data | PostgreSQL as system of record (in-memory only until persistence lands) |
| API | REST JSON |
| Tests | Vitest, including HTTP integration tests |
| Hosting | None in-repo |
| Compliance | None |
| Setup | Sensible defaults (git, folders, agent docs) |

## Consequences

- Coding agents must follow `architecture/constitution.md` instead of proposing Next.js, GraphQL, or Docker by default.
- Persistence work is expected; inventing SQLite or files on disk would contradict this ADR.
- Hosting can be added later as ADR 0002+, not as drive-by files.
