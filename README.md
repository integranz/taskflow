# taskflow

Personal **task API**: REST JSON for lists and tasks, TypeScript, Vitest, PostgreSQL.

## Quick start

1. Copy `.env.example` to `.env`.
2. Provide Postgres (no Compose in this repo). Example:

```bash
docker run -d --name taskflow-pg \
  -e POSTGRES_USER=taskflow \
  -e POSTGRES_PASSWORD=taskflow \
  -e POSTGRES_DB=taskflow \
  -p 5432:5432 postgres:16

docker exec taskflow-pg psql -U taskflow -d postgres -c 'CREATE DATABASE taskflow_test;'
```

3. Install and run:

```bash
npm install
npm test
npm run dev
```

`GET /health` → `{ "status": "ok", "version": "<VERSION or 0.0.0-local>" }` after a database ping.

`POST /lists` with `{ "name": "Inbox" }`.

## For agents

Start at `AGENTS.md`. Constitution and design live under `architecture/`.
