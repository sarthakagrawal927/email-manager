# Failed Approaches

Removed or shelved directions and the reason they did not ship. Read this
before reopening a closed direction. Each entry names what was removed, why,
and the commit or date so the history is recoverable.

## Entries

- [`2026-04-25-cf-pages-deploy.md`](2026-04-25-cf-pages-deploy.md) — CF Pages
  deploy target tried and reverted same-day; Pages does not support the
  Workers runtime APIs the app depends on.
- [`2026-04-25-nextauth-oidc-bypass.md`](2026-04-25-nextauth-oidc-bypass.md) —
  NextAuth with a hand-rolled "bypass OIDC discovery" patch; replaced by
  better-auth which avoids OIDC discovery entirely.
- [`2026-06-20-opennext-build-pipeline.md`](2026-06-20-opennext-build-pipeline.md) —
  The `@opennextjs/cloudflare` + Beasties + custom worker.mjs + pnpm sparse
  workaround build pipeline; replaced by Vite SPA + Hono Worker (De-OpenNext
  migration).

## How to add an entry

1. File name: `<date>-<short-topic>.md`.
2. State what was removed/shelved, the reason, the removing commit (if any),
   and the conditions under which it could be revisited.
3. Add a row to the list above.
4. Do not relitigate the decision here — that belongs in
   [`../../architecture/decisions.md`](../../architecture/decisions.md) if a
   new decision reverses it.
