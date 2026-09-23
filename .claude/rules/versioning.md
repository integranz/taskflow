---
paths:
  - "**/version.json"
  - ".github/workflows/**"
---
# Versioning rules (Nerdbank.GitVersioning)

- Every app has its own `<app path>/version.json` and its own version; there is no repository-wide version. Bump `version` in the app's file for a new minor/major. Patch numbers come from git height; never hand-write build numbers.
- The height counts only commits touching the app's `pathFilters` (its path, shared inputs, its workflows, `infra/apps/<app>`). Those filters are generated from `.slipway/config.yaml`; edit the config and re-scaffold, not the JSON. `version` and the rest of the file are never rewritten by the scaffold.
- Git tags are `<app>/v<version>` (`release.tagName`); image tags stay `<semver>` because the image repository already names the app. CI reads the version with the `dotnet/nbgv` GitHub Action (`path: <app path>`) and tags with `nbgv tag -p <app path>`.
- Public releases only from `publicReleaseRefSpec` branches (`main`); other branches produce prerelease versions that must not be deployed beyond `dev`.
- One versioning scheme per repository. Switching schemes is a `/slipway:bootstrap` decision, not a workflow edit.
