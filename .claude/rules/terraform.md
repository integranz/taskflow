---
paths:
  - "infra/**"
---
# Terraform rules

- Two layers, two lifecycles. `infra/foundation` (registry, key vault, identity, logs, role assignments, the Container Apps environment) changes rarely and is applied by a human after `/slipway:plan dev --layer foundation` and an approval token. `infra/apps/<app>` (one root module and one state per app: that app's compute and image tag) is applied only by that app's CD workflow.
- Always `fmt`, `validate`, then `plan -out=<planfile>`; apply only that exact plan file. Never `-auto-approve`, never `destroy` from a session.
- No secret values in `.tf`, `.tfvars` or state-adjacent files. Secrets are created out of band in Azure Key Vault and referenced by id; runtime access is via managed identity.
- Compute option `aca`: the per-app root modules are rendered from `templates/compute/aca/per-app`. Cross-app resources belong to `infra/foundation`; an app module never references another app's module or state.
- Image references use `var.image_tag` (immutable semver) with the registry `acrtaskflow.azurecr.io`; `latest` is rejected by the guard hook.
- Remote state lives in the storage account named in `.slipway/config.yaml` (`azure.state`); never commit `*.tfstate*` or `backend.hcl` with credentials.
- Detailed how-to: the `delivery-knowledge` skill, `references/compute-aca.md`.
