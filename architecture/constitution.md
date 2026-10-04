# Constitution

Non-negotiable constraints for taskflow. Change these only with a new ADR and an explicit user request.

1. **Personal tool with accounts.** Email + password self-registration (ADR 0004). Every list belongs to one user (`lists.owner_id`) and all list/task routes are scoped to the authenticated user. No roles, admin screens, OAuth, or sharing between users.
2. **REST + JSON only.** Resources are users, sessions, lists and tasks. No RPC layer, no GraphQL.
3. **PostgreSQL is the database.** There is one write path (`src/db`). Do not add an in-memory fallback.
4. **TypeScript stays strict.** No `any` in new code. No disabling `strict`.
5. **Tests gate behavior.** Public HTTP routes have Vitest coverage. Do not ship untested status codes.
6. **Hosting is slipway delivery** (ADR 0003). Do not add Docker, Terraform, or cloud files outside that layout.
7. **No compliance overlays.** Do not add HIPAA, PCI, or GDPR modules “just in case.”
8. **Errors are boring.** `{ "error": "..." }` and the correct HTTP status. No wrapped envelope unless an ADR says so.
9. **IDs are UUIDs.** Clients never assign identifiers.
10. **Docs track reality.** A behavior change that lasts more than one session updates `CONTEXT.md`.
