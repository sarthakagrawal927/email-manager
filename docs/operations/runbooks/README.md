# Runbooks

Step-by-step runbooks for email-manager operations. Each runbook is a focused,
copy-pasteable procedure for a recurring operational task.

## Available runbooks

- [`local-dev.md`](local-dev.md) — set up and run the local dev environment.
- [`oauth-setup.md`](oauth-setup.md) — register Google OAuth callback URLs in
  Google Cloud Console (the most common setup footgun).
- [`digest-verify.md`](digest-verify.md) — verify the weekly digest builder
  against golden fixtures.
- [`deploy.md`](deploy.md) — deploy to Cloudflare Workers (manual).

## When to add a runbook

A runbook belongs here when a procedure is:
- Recurring (not one-off).
- Operational (not development workflow — those go in
  [`../../development/`](../../development/)).
- Multi-step (not a single command).
