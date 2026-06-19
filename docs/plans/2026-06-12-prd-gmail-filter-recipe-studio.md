# Gmail filter recipe studio

**Status:** Draft
**Product:** Email Manager
**Theme:** Filter discovery and export
**Primary surface:** `GmailFilterBuilder`

## Problem

The app can already sample inbox patterns and generate filter suggestions, but the experience is still mostly a utility panel. There is a bigger opportunity: help users identify repeat patterns, understand why a rule exists, and export a clean Gmail filter recipe with confidence.

## Target user

A power user who wants to tame recurring mail without building every Gmail rule manually.

## Current failure

- Filter suggestions are generated, but they are not framed as a workflow.
- The user cannot easily compare candidate recipes or understand what each one buys them.
- Export exists, but the screen does not yet feel like a full recipe studio.

## Desired behavior

The user can:

- sample inbox messages,
- review categories such as newsletters, receipts, notifications, and follow-ups,
- inspect why a recipe was suggested,
- choose a subset of suggestions,
- export Gmail-compatible filter XML,
- copy a human-readable recipe summary for later use.

## Non-goals

- No automatic Gmail rule creation.
- No hidden background sampling.
- No inbox-wide destructive actions.

## UX shape

- Keep the current sampling controls.
- Add a "recipe" view that shows:
  - category,
  - match rationale,
  - suggested action,
  - likely archive impact.
- Show a side-by-side preview of:
  - selected suggestions,
  - generated XML,
  - a short explanation string.

## Success proof

- A user can sample the inbox and get a usable recipe in one session.
- A user can tell why a suggestion exists before exporting it.
- The output can be pasted into Gmail without further cleanup.

## Acceptance criteria

- Existing suggestion generation stays local and deterministic.
- XML export remains Gmail-compatible.
- The studio explains the recipe in plain language.
- No new production dependencies are added.

## Risks

- Overexplaining can crowd the screen.
- Samples that are too small can produce weak recipes.
- Misclassifying senders could create unhelpful suggestions, so the rationale text must be explicit.

## Suggested follow-up

- Add saved recipe presets only after the export flow proves useful.
