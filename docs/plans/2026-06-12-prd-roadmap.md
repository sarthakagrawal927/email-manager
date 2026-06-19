# Email Manager PRD Roadmap

**Status:** Draft
**Date:** 2026-06-12
**Scope:** Three large feature suggestions that fit the current client-first, read-only Gmail workspace.

## Why these three

The repo already has working surfaces for:

- local semantic search,
- sender analytics,
- unsubscribe review,
- filter suggestion export,
- a pure weekly digest builder.

The highest-leverage next features are the ones that turn those capabilities into repeatable workflows rather than more one-off views.

## Suggested PRDs

1. [Weekly digest preview and export loop](./2026-06-12-prd-weekly-digest-preview.md)
2. [Triage action queue with deferred follow-up](./2026-06-12-prd-triage-action-queue.md)
3. [Gmail filter recipe studio](./2026-06-12-prd-gmail-filter-recipe-studio.md)

## Selection logic

- Digest creates retention and re-engagement without new OAuth scopes.
- Triage action queue converts local observations into a daily habit loop.
- Filter recipe studio turns current heuristics into a durable power-user workflow.

## Implementation order

1. Digest preview and export loop.
2. Triage action queue.
3. Filter recipe studio.

This ordering follows current code readiness: digest is already modeled in `src/lib/digest.ts`, triage already has action state plumbing, and the filter builder already has a sampling + export path.
