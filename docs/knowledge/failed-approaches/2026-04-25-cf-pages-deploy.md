# Failed Approach: CF Pages Deploy Target

**Date:** 2026-04-25
**Status:** Reverted same-day
**Removing commit:** Same-day revert to CF Workers

## What was tried

Deploying email-manager to Cloudflare Pages instead of Cloudflare Workers. The
OpenNext docs listed Pages as a supported deploy target, so it was attempted
during the 2026-04-25 infrastructure rewrite.

## Why it did not ship

CF Pages does not expose the Workers runtime APIs that the custom worker entry
and OpenNext's D1/DO bindings depend on:

- `caches.default` (edge cache for `/`)
- `ctx.waitUntil`
- Durable Object exports
- D1 bindings (at the time)

The deploy bounced CF Workers → CF Pages → CF Workers within a single day.

## What replaced it

CF Workers via `@opennextjs/cloudflare` (which itself was later replaced by
Vite SPA + Hono Worker on 2026-06-20 — see
[`2026-06-20-opennext-build-pipeline.md`](2026-06-20-opennext-build-pipeline.md)).

## When it could be revisited

Only if Cloudflare Pages adds full Workers runtime API compatibility AND the
app's dependency on `caches.default` / D1 bindings is removed. Unlikely —
Workers is the correct target for this app.

## Related

- [`../../architecture/decisions.md`](../../architecture/decisions.md) ADR-004
  (CF Workers + D1).
- [`../../retros/2026-04-25-cf-workers-migration.md`](../../retros/2026-04-25-cf-workers-migration.md).
- [`../learnings/lessons.md`](../learnings/lessons.md) lesson 13 (CF Pages →
  Workers migration was same-day).
