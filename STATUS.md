# STATUS — email-manager

Last updated: 2026-07-19

This is the short, operative view of where email-manager is right now. For the
full timeline and shipped-feature inventory, see
[`PROJECT_STATUS.md`](PROJECT_STATUS.md). For the knowledge base, see
[`docs/README.md`](docs/README.md).

## Current objective

Keep email-manager as a stable, private Gmail workspace: read-only mailbox
access, client-side semantic search, sender analytics, unsubscribe workflows,
and weekly digest — all with mailbox content and embeddings never leaving the
browser. No new feature work is planned unless validated demand reopens a
paused direction.

## Active work

- **Foundry evidence automation** (this branch): privacy-safe build/sync/auth
  evidence for the Foundry. Added durable sync failure recording
  (`InboxSyncMeta.lastError`), sync lifecycle unit tests, a
  `pnpm foundry:evidence` script, and a CI workflow that uploads the evidence
  artifact. See [`docs/operations/foundry-evidence.md`](docs/operations/foundry-evidence.md).
- **Maintenance baseline**: keyboard triage, digest verification, and global
  error handling are the maintained baseline. Bug fixes and dependency updates
  only.

## Blockers

None active. The app is in finish-and-pause mode (2026-07-10).

## Unresolved questions

- Should the planned IndexedDB `digests` store (90-day retention) be built?
  Paused — reopen only for validated digest usage. See
  [`docs/plans/2026-06-04-email-memories-digest.md`](docs/plans/2026-06-04-email-memories-digest.md).
- Should signed-in e2e flows be added to CI? Paused — OAuth remains
  operator/manual-only; unit tests cover lib logic.

## Next steps

1. Finish and review the documentation consolidation (validation script, CI
   check, Blume build verification).
2. Keep `main` green: `pnpm lint && pnpm test && pnpm build` on every push.
3. Monitor for digest usage signal before reopening the `digests` store work.

## Open audit items

From [`AUDIT.md`](AUDIT.md):

- [ ] Rotate the SaaS Maker public key in `.env.local` if the project is
      permanently archived.
- [ ] Revoke Google OAuth app credentials in GCP console if no longer needed.
- [ ] Consider deleting `node_modules/` to reduce disk footprint while paused.
