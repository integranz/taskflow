# taskflow

**Task API** with accounts: REST JSON for users, lists and tasks, TypeScript, Vitest, PostgreSQL.

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

## Using the API

`GET /health` → `{ "status": "ok", "version": "<VERSION or 0.0.0-local>" }` after a database ping.

Register once, then send the token on every other call:

```bash
curl -s -X POST localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"password123"}'
# → 201 { "user": { "id", "email", "createdAt" }, "token": "...", "expiresAt": "..." }

curl -s -X POST localhost:3000/lists \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"name":"Inbox"}'
# → 201 { "list": { "id", "name" } }
```

`POST /auth/login` returns the same shape. `POST /auth/logout` revokes the token. The full route list is in `architecture/design.md`.

## For agents

Start at `AGENTS.md`. Constitution and design live under `architecture/`.
