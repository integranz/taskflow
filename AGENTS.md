# Agent guidance

This repository was bootstrapped with **Architect**. Read these files before changing behavior:

1. `CONTEXT.md` — current snapshot
2. `architecture/constitution.md` — non-negotiables
3. `architecture/design.md` — intended shape
4. `docs/adr/` — why we chose what we chose
5. `docs/agents/` — working agreements

## Rules

- Prefer a small, correct REST change over a new framework.
- Do not add hosting, Docker, or cloud files unless the user asks.
- Do not add HIPAA/GDPR/PCI overlays; this is a personal tool.
- Keep TypeScript strict. Do not weaken `tsconfig.json` to ship a feature.
- Every new endpoint needs a Vitest test under `tests/`.
- Keep SQL and connection code under `src/db/`. HTTP handlers use `Store` only.
- Update `CONTEXT.md` when the running system diverges from the docs.
- Record material trade-offs as a new ADR (`docs/adr/NNNN-title.md`). Do not silently reverse an ADR.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run dev
```

Copy `.env.example` to `.env`. `DATABASE_URL` is required for `npm run dev` and `npm test`.
