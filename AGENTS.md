# AGENTS.md — start here (taskflow)

Personal REST API for lists and tasks

This repository is delivered by the **slipway** plugin (Claude Code and Cursor, 1.6.0). This file is the routing page for humans and agents: what is here, which skill to run, which rules apply. Procedures live in the plugin's skills, not here.

## Layout
| App | Path | Kind | Stack | Port | Health |
|---|---|---|---|---|---|
| `api` | `.` | api | custom | 3000 | `/health` |


| Path | Purpose |
|---|---|
| `.slipway/config.yaml` | Delivery options and app inventory (source of truth for every slipway skill) |
| `.slipway/SETUP.md`, `.slipway/setup-azure.sh` | Prerequisites: what a human does (logins, Docker Hub token, MCP grant) and what `/slipway:launch` automates behind permission prompts (Entra app + OIDC, state storage, RBAC, secrets, environment, ruleset) |
| `.slipway/.env.example` | Seed file template for local secrets; the copy `.slipway/.env` is gitignored, only ever sourced, never printed |
| `infra/foundation/` | Shared cloud resources (registry, key vault, identity, logs, Container Apps environment). Applied by a human after `/slipway:plan`; never by an agent alone |
| `infra/apps/api/` | Compute + image tag of `api` only (own state). Applied only by `taskflow-api-cd` behind the environment approval |
| `.github/workflows/_ci.yml`, `_cd.yml` | Shared CI / CD stages (`workflow_call`), used by every app's thin workflows below |
| `.github/workflows/taskflow-api-ci.yml` | CI of `api`: version from `version.json`, test, image, tag `api/v<semver>`. Runs only when its inputs change |
| `.github/workflows/taskflow-api-cd.yml` | CD of `api`: plan, human approval, apply `infra/apps/api`, smoke test; starts automatically after a green CI on `main` |
| `compose.yaml` | Local run of all app images as built for the cloud (frontends use `nginx.local.conf`) |
| `.claude/rules/` | Path-scoped rules (see Rules below) |

## Pipelines (one CI and one CD per app)
| App | CI workflow | CD workflow | Version file | Git tag | Inputs (triggers = version pathFilters) |
|---|---|---|---|---|---|
| `api` | `taskflow-api-ci` | `taskflow-api-cd` | `version.json` | `api/v<semver>` | `**`, `!.slipway`, `!**/*.md`, `!**/.terraform.lock.hcl` |
A change to a path listed for one app only builds, versions and deploys that app; a path listed for several apps (shared inputs) triggers each of them. CD trigger: `on-ci-success`; pull-request behaviour: `always-run-gate` (see `.claude/rules/pipelines.md`).

## Delivery options chosen
| Dimension | Option |
|---|---|
| cloud | `azure` — Microsoft Azure |
| compute | `aca` — Azure Container Apps |
| registry | `acr` — Azure Container Registry |
| runner | `github-actions` — GitHub Actions |
| versioning | `nbgv` — Nerdbank.GitVersioning |
| branching | `trunk` — Trunk-based (main + short-lived branches + PRs) |
| tracker | `jira` — Jira Cloud (Atlassian Rovo MCP Server; Standard plan or higher) |
| secret_store | `azure-key-vault` — Azure Key Vault |
| base_image | `dhi` — Docker Hardened Images (dhi.io |
| cd_trigger | `on-ci-success` — Automatic: <prefix>-<app>-cd starts when <prefix>-<app>-ci succeeds on the default branch, targeting the CD environment; the environment approval gate still applies |
| pr_checks | `always-run-gate` — Always start; a first gate job lists the changed files and skips the rest when the app is untouched (a skipped job counts as passed, so the checks can be required on the branch) |
| cd_approval | `github-ui` — On the workflow run page in GitHub (Review deployments), by a required reviewer |
| config_store | `env` — Environment variables set by Terraform from apps[].env (simplest; a change creates a new revision) |
| database | `none` — No: the app receives its connection string from the secret store (you set the value) |
| registry_scope | `per-repository` — Own registry, created by this repository's foundation layer (default; the resource group is the security boundary) |
| apply_gate | `prompt` — In the session: the guard hook asks for permission with the plan summary and the human answers the prompt (Claude Code enforces it; Cursor shows its command approval, so keep auto-run off). Unattended sessions still need the token |
| evidence_store | `release` — GitHub Release of the tag (default): CI creates the release when it tags, CD attaches the deploy outputs and smoke test, verify attaches its report; nothing is committed and the record stays next to what it verifies |

Change an option with `/slipway:bootstrap`; do not edit generated files by hand to switch options.

## I want to…
| Goal | Run |
|---|---|
| Do everything end to end, resumable (preflight → bootstrap → cloud and GitHub prerequisites → images → foundation → CI/CD → verify → tracking) | `/slipway:launch` |
| Onboard or change delivery options | `/slipway:bootstrap` |
| Build and smoke-test one app image locally | `/slipway:dockerize <app path>` |
| Run every app image together locally | `VERSION=$(nbgv get-version -v SemVer2) docker compose up --build` (see `compose.yaml`) |
| See what infrastructure would change | `/slipway:plan <env> --layer foundation\|apps/<app>` |
| Deploy a released tag of one app | `/slipway:deploy <app> <tag> <env>` |
| Prove a deployment is correct | `/slipway:verify <app> <env> <tag>` |
| Track the work | `/slipway:ticket show` (story + subtasks), `story create\|set`, `subtask start\|review\|done "<title>"`, `sync` |
| Understand the repo before changing it | ask for the `explore` sub-agent |
| Make a scoped change with proof | ask for the `execute` sub-agent with an acceptance command |
| Check claims independently | ask for the `verify` sub-agent |

## Skills
<available_skills>
- slipway:launch — the whole delivery in one command; stops only for human decisions and approvals
- slipway:bootstrap — intake interview, app classification, scaffold, cloud prerequisites, ticket
- slipway:dockerize — hardened multi-stage Dockerfile for one app, built and health-checked
- slipway:plan — terraform fmt/validate/plan for one layer; never applies
- slipway:deploy — trigger and monitor CD for an immutable tag
- slipway:verify — falsifiable post-deploy checks; the report is attached to the GitHub Release of the tag (`<app>/v<version>`), next to the release manifest and the deploy outputs
- slipway:ticket — epic → story → subtask tracking with read-backs and an offline queue
- slipway:delivery-knowledge — option reference material (model-invoked)
</available_skills>
Skills come from the plugin (`slipway@slipway-marketplace`, source `integranz/slipway`), declared in `.claude/settings.json`. Local sessions install it once with `/plugin install slipway@slipway-marketplace`; cloud sessions install it automatically.

## Sub-agents
`explore` (read-only facts with `path:line` evidence), `execute` (one scoped change + acceptance output), `verify` (CONFIRMED / REFUTED / UNVERIFIABLE per claim). None of them may apply infrastructure, push images or trigger workflows; guard hooks enforce this.

## Systems of record and tool policy
| Need | Use | Not |
|---|---|---|
| Tickets | `/slipway:ticket` (tracker: Jira Cloud (Atlassian Rovo MCP Server; Standard plan or higher); story `DEVOPS-13`) | manual browser updates |
| Pipeline status, logs, trigger CD | GitHub MCP via `/slipway:deploy` / `/slipway:verify` | `gh` for writes |
| Cloud inventory for verification | Azure MCP (read-only) or `az … show/list` | Azure MCP for changes |
| Infrastructure changes | Terraform in `infra/*` under the guard hooks | portal, `az … create`, Azure MCP writes |
| Images | CI pushes `acrtaskflowdev.azurecr.io/<repo>:<semver>` | `docker push` from a laptop, `latest` tags |

## Rules and precedence
Non-negotiables are in `CLAUDE.md`. Path-scoped rules are in `.claude/rules/` and load only when matching files are touched: `terraform.md` (`infra/**`), `pipelines.md` (`.github/workflows/**`), `docker.md` (Dockerfiles), `versioning.md`, `branching.md`. Precedence when instructions overlap: managed policy → user (`~/.claude/CLAUDE.md`) → project (`CLAUDE.md`, `.claude/rules/`) → `CLAUDE.local.md`. Hooks from the plugin are mechanical and cannot be relaxed by any of these; see `.claude/rules/precedence.md`.

## Multi-repo
Open **this repo alone** as the workspace root when working on the apps or their delivery. The plugin repo (`integranz/slipway`) owns cross-cutting changes (templates, hooks, skills); propose changes there rather than patching generated files here. Keep one `.mcp.json`/MCP policy per repo: this repo relies on the plugin's servers and declares none of its own.

## Other agents
Cursor reads this file natively (plain-markdown agent instructions). slipway is also a **Cursor plugin** (same repository, `.cursor-plugin/marketplace.json`; install it from a team marketplace import of `integranz/slipway` or with the repository's `npm run install:cursor-local`): the same skills as `/launch`, `/bootstrap`, `/dockerize`, `/plan`, `/deploy`, `/verify` and `/ticket`, the same guard hooks (this repository's `.cursor/hooks.json` routes Cursor's hook events through `.slipway/cursor-hooks.sh` to the installed plugin's adapters; without the plugin they allow everything and say so at session start), read-only explore/verify subagents and the same MCP servers. One difference: a local foundation `terraform apply` in Cursor always needs the human approval token (`bash <plugin-root>/scripts/approve-apply.sh <planfile>` in your own terminal), because Cursor cannot force a permission prompt from a hook. `cursor_mirror` in `.slipway/config.yaml` remains reserved and changes nothing.

## Cursor Cloud
Cursor Cloud Agents build this repository's VM from `.cursor/environment.json`: its install step, `.slipway/cursor-install.sh`, installs the slipway plugin 1.6.0 into `~/.cursor/plugins/local/slipway` (so `.cursor/hooks.json` enforces the same guards in the cloud), marks the environment **unattended** and exports `CLAUDE_PLUGIN_ROOT`. Consequences for an agent running here:
- Skills are not registered as slash commands in the cloud: to run one, read `~/.cursor/plugins/local/slipway/skills/<name>/SKILL.md` (`launch`, `bootstrap`, `dockerize`, `plan`, `deploy`, `verify`, `ticket`) and follow it with `CLAUDE_PLUGIN_ROOT=$HOME/.cursor/plugins/local/slipway`.
- Nobody can answer a prompt: `terraform apply`, cloud administration, GitHub environment/secret writes and Key Vault writes are **denied** here (a desktop session gets a prompt instead); print the exact command for a human instead of retrying. Work that fits the cloud: scaffold changes, Dockerfiles and local image builds (the environment starts Docker when it is available), `terraform plan`/`validate`, verification reports, pull requests.
- Credentials arrive only as environment variables from the Cloud Agent **Secrets** tab (for example `GITHUB_MCP_TOKEN` for the GitHub MCP server); never copy one into a file, a command line or a message. The Atlassian MCP needs a browser OAuth, so tracker updates are queued in `.slipway/tracking-queue.jsonl` for a later `/slipway:ticket sync` on a desktop.
- The probe `echo approve-apply-probe && date` must be blocked here too. If it runs, the plugin is not installed in this environment (check the Build log of `.slipway/cursor-install.sh`) and no delivery work may start.
