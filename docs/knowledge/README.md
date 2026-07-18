# Knowledge

Durable learnings and failed approaches worth remembering. This directory is
for cross-cutting knowledge that does not belong to a single feature or
runbook. Code shows what; this directory captures why and what we learned.

## Subdirectories

- [`learnings/`](learnings/) — project-specific gotchas and patterns
  (Transformers.js/ONNX, IndexedDB, Cloudflare Workers, OAuth/auth). One file
  per topic, plus a consolidated `lessons.md` and `external-references.md`.
- [`failed-approaches/`](failed-approaches/) — removed or shelved approaches
  and the reason they did not ship. Read before reopening a closed direction.

## When to add here

- A non-obvious gotcha that took real time to diagnose → `learnings/`.
- A feature or architectural direction that was built, then removed or shelved
  → `failed-approaches/` with the reason and the removing commit.
- A decision record belongs in
  [`../architecture/decisions.md`](../architecture/decisions.md), not here.
- A runbook belongs in [`../operations/runbooks/`](../operations/runbooks/).
