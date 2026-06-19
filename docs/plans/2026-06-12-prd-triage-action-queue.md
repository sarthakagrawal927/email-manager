# Triage action queue with deferred follow-up

**Status:** Draft
**Product:** Email Manager
**Theme:** Inbox workflow automation
**Primary surface:** `TriageQueues` + `EmailDetail`

## Problem

The app can classify messages and expose useful actions, but those actions are still fragmented across views. Users need a repeatable queue that turns "I noticed this" into "I acted on it" without leaving the read-only model.

## Target user

A heavy Gmail user who wants to process inbox items in batches and keep a visible record of what they deferred, summarized, replied to, or ignored.

## Current failure

- Triage actions are available, but the workflow is not yet a durable queue.
- Deferred follow-up exists as local state, but there is no clear worklist narrative.
- The product lacks a simple way to measure completion and revisit rate.

## Desired behavior

The user can:

- triage messages from a queue,
- queue follow-up reminders locally,
- see which items are active, deferred, applied, ignored, or failed,
- review the latest state in both the inbox row and the thread detail view,
- keep the behavior read-only and reversible.

## Non-goals

- No automatic send, archive, delete, or label changes.
- No background scheduling service.
- No inbox-wide AI autopilot.

## UX shape

- Add a compact triage action bar above message lists and thread detail.
- Show a queue ledger with:
  - queued,
  - applied,
  - ignored,
  - failed.
- Make the deferred follow-up date visible on the row and in the detail panel.
- Provide a single "undo / clear" path for recently applied actions.

## Success proof

- A user can process a batch of messages and see the state reflected immediately.
- Deferred items reappear when the snooze expires.
- The app can show a stable count of active queue items.

## Acceptance criteria

- Queue state remains client-local.
- `runTriageAction(...)` remains the execution path for action side effects.
- `buildActiveMap(...)` determines what is active at render time.
- `TriageQueues` and `EmailDetail` show the same record state.
- No Gmail write scopes are introduced.

## Risks

- If the queue becomes too noisy, users may ignore it.
- The most visible actions must remain safe and clearly reversible.
- Clipboard-based summarization is only useful if the brief is concise enough.

## Suggested follow-up

- Add keyboard shortcuts and a compact "recent actions" panel only after the core queue feels stable.
