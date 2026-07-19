# Scheduled Jobs

Catalog of recurring automated jobs that touch email-manager. The executable
schedule is authoritative and lives in code: `.github/workflows/*.yml` (GitHub
Actions). This file is the human-readable index — update it when a job is
added, retired, or its cadence changes.

## GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | Cadence | Purpose |
| --- | --- | --- | --- |
| `ci.yml` | `push`/`pull_request` to `main`/`master` | Every push/PR | `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm check:docs` |
| `deploy.yml` | `workflow_dispatch` (manual) | Manual only | Build + `wrangler deploy` + production smoke check |
| `foundry-evidence.yml` | `push` to `main`/`master` + `cron: 0 6 * * 1` + `workflow_dispatch` | Every push to main + weekly (Mondays 06:00 UTC) | `pnpm foundry:evidence` → uploads `foundry-evidence.json` artifact (30-day retention) |
| `weekly.yml` | `cron: 0 9 * * 1` (Mondays 09:00 UTC) + `workflow_dispatch` | Weekly | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + Playwright e2e (installs browsers) |

## Notes

- **CI (`ci.yml`)** runs on every push and PR to `main`/`master`. It covers
  lint, unit tests, build, and docs validation. It does NOT run typecheck or
  e2e (those are in the weekly workflow).
- **Deploy (`deploy.yml`)** is manual only (`workflow_dispatch`). Production
  deploys are never automatic. The workflow builds, deploys via
  `wrangler deploy`, and runs a post-deploy smoke check against the production
  worker URL.
- **Weekly (`weekly.yml`)** runs the full quality suite including typecheck and
  Playwright e2e (with browser installation). It auto-detects the package
  manager and runs available scripts conditionally.
- **Foundry evidence (`foundry-evidence.yml`)** generates a privacy-safe
  `foundry-evidence.json` (build/sync/auth invariants, no email content or
  tokens) and uploads it as a 30-day workflow artifact for the Foundry. See
  [`../foundry-evidence.md`](../foundry-evidence.md).

## No local cron jobs

email-manager has no local Codex automations or cron jobs. All scheduled work
is in GitHub Actions.
