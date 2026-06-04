# Project status — email-manager (Kinetic)

Last updated: 2026-06-04

## Done / stable

- Gmail read-only inbox workspace (triage, semantic search, analytics, unsubscribe)
- Client-side IndexedDB cache + in-browser embeddings
- Cloudflare Workers deploy + better-auth on D1
- **Email memories / weekly digest prototype** (brief + fixture-backed logic + TLL export verification, no UI yet)

## Planned next

1. **Digest preview UI** (`#digest` view) — render `buildWeeklyDigest()` from IndexedDB on user action
2. IndexedDB `digests` store with 90-day retention (see `docs/plans/2026-06-04-email-memories-digest.md`)
3. Google OAuth redirect URI for production Workers URL (tracked separately)

## Deferred / parked

- Server-side digest cron or email delivery
- LLM-written digest prose
- Automatic sync to Today Little Log (manual export only in plan)
- Commercial “personal reporter” positioning

## Reference

- Digest plan: [docs/plans/2026-06-04-email-memories-digest.md](docs/plans/2026-06-04-email-memories-digest.md)
- Fixture verify: `pnpm digest:verify`
