---
paths:
  - ".github/workflows/**"
---
# Pipeline rules (GitHub Actions)

- One CI and one CD workflow **per app**, named `taskflow-<app>-ci` and `taskflow-<app>-cd`; both are thin callers of the shared reusable workflows `_ci.yml` and `_cd.yml` (`workflow_call`). Never combine apps in one workflow.
- Triggers are path-filtered: `on.push.paths` (and `on.pull_request.paths` with `pr_checks=path-filtered`) list exactly the app's inputs from `.slipway/config.yaml` (its path, declared `paths`, `shared_paths`, the four workflow files, `infra/apps/<app>`). The same list is the `pathFilters` of the app's `version.json`; `/slipway:verify` refutes a deployment when they disagree. Change the list in the config and re-scaffold, never in the workflow.
- On pull requests every app CI starts and its `<app> changes` job decides whether the rest runs (a conditionally skipped job counts as passed), so the per-app checks may be required on `main`: require exactly `<app> changes` and `<app> ci` per app. `<app> ci` is the always-running result job (success when the app was built or skipped, failure otherwise); the nested `<app> / test` and `<app> / image` checks do not exist when the app is skipped and must not be required.
- CI builds and tests on pull requests without pushing anything; only pushes to `main` push `acrtaskflowdev.azurecr.io/<repo>:<semver>`, create the git tag `<app>/v<semver>` and publish `release-manifest-<app>-<semver>`.
- CD starts automatically when the app's CI succeeds on `main` (`workflow_run`; the tag is read from that run's release manifest, since `workflow_run` cannot carry inputs) and targets `dev`; other environments and re-deploys use `/slipway:deploy <app> <tag> <env>`.
- CD applies `infra/apps/<app>` behind the GitHub Environment approval; no other job runs `terraform apply`, and one app's CD never touches another app's state.
- Cloud authentication is OIDC federated credentials (`azure/login` with `id-token: write`); no client secrets in repository secrets.
- Every pushed image tag is immutable and traceable to a commit (`sha-<short>` alias allowed alongside the semver).
- Cloud identity in workflows comes only from the repository secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (exported to Terraform as `ARM_CLIENT_ID`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID` with `ARM_USE_OIDC=true`, `ARM_USE_AZUREAD=true`). Hardened base images are pulled after `docker/login-action` with `registry: dhi.io`, `username: ${{ vars.DOCKERHUB_USERNAME }}`, `password: ${{ secrets.DOCKERHUB_TOKEN }}`. No other credentials exist; see `.slipway/SETUP.md`.
