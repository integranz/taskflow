# ADR 0003: Slipway delivery

- Status: accepted
- Date: 2026-09-23
- Supersedes: ADR 0001 hosting row ("None in-repo"); ADR 0002 sentences that keep Compose and cloud manifests out of the tree

## Context

The user ran `/launch` and confirmed Azure Container Apps delivery for this repository. Constitution item 6 allowed hosting in-tree only when requested, and required an ADR before deployment files.

## Decision

- Delivery is slipway-managed. `.slipway/config.yaml` is the source of truth.
- One app, `api`, at the repository root. Stack is `custom` because a curated Node/TypeScript image is not available yet. The image is `Dockerfile` (Docker Hardened Images, non-root).
- Cloud is Azure in `westeurope`: Container Apps, Azure Container Registry, Key Vault. Terraform lives under `infra/foundation` and `infra/apps/api`.
- `DATABASE_URL` is a Key Vault secret. `PORT` is a plain environment variable.
- CI tests use a PostgreSQL service container. The app database is not provisioned by Terraform.
- GitHub Actions workflows are `taskflow-api-ci` and `taskflow-api-cd`. CD starts after a green CI on `main` and still waits for the GitHub environment approval.
- `GET /health` returns `version` from the `VERSION` environment variable so the image tag can be checked.

## Consequences

- Agents add hosting files only through slipway scaffold or a confirmed custom Dockerfile change.
- Subscription and tenant IDs stay out of the committed config.
- ADR 0002 still decides the database. It no longer forbids the delivery Compose file or the Terraform modules.
