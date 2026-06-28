# email-manager — PROJECT STATUS
Last updated: 2026-06-28

## Why / What

**Email Manager** is a Gmail inbox workspace with local-first semantic search. Product thesis: read-only Gmail cockpit where mailbox contents and embeddings never leave the browser — server stores only auth sessions.

**Users:** Gmail users wanting semantic search, sender analytics, unsubscribe workflows, and weekly digest reflection without server-side mailbox storage.

**Constraints:** Stable maintenance mode after De-OpenNext migration (2026-06-20). Gmail OAuth scope is read-only. Unsubscribe requires explicit user click. Automation safety: no silent mailbox mutations.

**IN scope:** Vite SPA + Hono worker, Astro landing, IndexedDB cache, client-side embeddings, triage/digest/filter studio.

**OUT of scope:** Server-side digest cron/delivery, LLM-written digest prose, automatic Today Little Log sync, saved filter presets, commercial "personal reporter" positioning.

## Dependencies

### External

- **Google OAuth (better-auth):** read-only Gmail scopes (`openid`, `email`, `profile`, `gmail.readonly`); offline access with consent prompt.
- **Gmail REST API:** fetched on demand via worker with 429 exponential backoff (1s/2s/4s).
- **Hugging Face Transformers/ONNX:** client-side embeddings in IndexedDB (`@huggingface/transformers`).
- **PostHog:** client analytics (`VITE_POSTHOG_KEY`).
- **Cloudflare:** Workers (Hono), D1 (`email-manager-auth`).
- **Secrets (names only):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

### Internal (fleet)

- **Today Little Log:** manual digest export via `digestToTodayLittleLogExport()` clipboard copy only — no automatic sync.

### Stack & commands

**Stack:** Vite SPA + Hono worker on Cloudflare Workers; Astro landing at `/`; better-auth + Google OAuth on D1 (Drizzle); client-side `@huggingface/transformers` embeddings in IndexedDB; PostHog; React Router v7.

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install deps |
| `cp .env.example .dev.vars` | Local wrangler secrets |
| `pnpm dev` | Vite :5173 + wrangler :8787 |
| `pnpm dev:api` | Wrangler only (after build) |
| `pnpm dev:spa` | Vite only |
| `pnpm build` | Vite build + Astro overlay → `dist/` |
| `pnpm typecheck` | TS check (app + worker) |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright (desktop + mobile) |
| `pnpm digest:verify` | Golden-file digest fixture check |
| `pnpm deploy` | Build + `wrangler deploy` |

**OAuth callbacks (must register in Google Cloud Console):**
- `http://localhost:8787/api/auth/callback/google`
- `https://email-manager.sarthakagrawal927.workers.dev/api/auth/callback/google`

## Timeline

- **2026-06-20** — De-OpenNext migration: Next.js+OpenNext → Vite SPA + Hono worker on Cloudflare Workers; Astro landing overlaid to `dist/index.html`; D1 only server DB (Turso residue removed).
- **2026-06-20** — Shipped PRD batch (2026-06-12): weekly digest, triage action queue, Gmail filter recipe studio.
- **2026-06-12** — PRD batch defined: weekly digest, triage queues, filter recipe studio.
- **Ongoing** — CI push to `main` auto-deploys; weekly workflow full checks Mondays 09:00 UTC.

## Products

- **Worker (SPA + API):** https://email-manager.sarthakagrawal927.workers.dev — worker `email-manager`; D1 `email-manager-auth` (`e770dfa2-1032-4a12-b0fb-52e77f5319e8`).
- **Landing:** `/` Astro static marketing overlaid to `dist/index.html` (not separate Pages project).
- **App shell:** `/app` SPA with hash-based sub-views; signed-in users 302 from `/` → `/app`.
- **Local dev:** Vite :5173 + wrangler :8787.

## Features (shipped)

### SPA routes (`src/router.tsx`)

- `/` → `RootLayout` with `Providers` + `ErrorBoundary`.
- `/app` → `HomeClient` (Gmail cockpit; hash-based sub-views).
- `/about`, `/privacy` — static pages.
- `*` → `NotFoundPage`.

### Hash views inside `/app` (`HomeClient.tsx`)

- `#today` — TriageQueues (default).
- `#inbox`, `#starred`, `#sent`, `#trash` — mailbox lists + detail.
- `#search` — SemanticSearch (sync/index embeddings + query).
- `#subscriptions` — deduplicated unsubscribe candidates.
- `#digest` — WeeklyDigestView.
- `#filters` — GmailFilterBuilder recipe studio.
- `#analytics` — sender analytics by bucket.
- Unauthenticated `/app` renders inline Google sign-in UI.

### Worker API (`src/worker.ts`)

- `GET|POST /api/auth/*` — better-auth handler (Google OAuth).
- `GET /api/emails` — list with `q`, `label`, `pageToken`, `maxResults` ≤500, `metadataOnly`.
- `GET /api/emails/:id` — single email.
- `POST /api/emails/:id/unsubscribe` — RFC 8058 one-click POST; HTTPS-only; fallback URL on failure.
- Security headers on all `/api/*` responses.

### Architecture

- `GET /` serves Astro landing; signed-in users 302 → `/app`.
- SPA shell at `/app`, `/about`, `/privacy` from `dist/spa-index.html`.
- Hono worker handles `/api/*`: better-auth, Gmail proxy reads, unsubscribe POST.
- Gmail fetched on demand via worker with 429 exponential backoff (1s/2s/4s); cached in IndexedDB `email-search` v1.
- Embeddings generated in-browser with Hugging Face Transformers/ONNX; semantic search client-side.
- D1 (`email-manager-auth`) stores only better-auth tables — no mailbox data.
- Build: Vite → `dist/spa-index.html`; Astro landing overlaid to `dist/index.html` via `scripts/overlay-landing.mjs`.

### IndexedDB schema (`src/lib/db.ts`)

- Database: `email-search` v1; store `emails` keyed by `id`; index `by-date`.
- Record: `StoredEmail` = `Email` + `embedding: number[] | null`.
- Helpers: `storeEmails`, `getAllEmails`, `getEmailsWithoutEmbedding`, `getEmailCount`, `getIndexedCount`, `exportEmails`.

### D1 schema (`migrations/0001_better_auth.sql`)

- Tables: `user`, `session`, `account`, `verification` with standard better-auth columns.
- Binding: `DB` → `email-manager-auth`.

### Core inbox workspace

- Gmail read-only views across all hash routes above.
- Semantic search over locally generated embeddings; metadata search in lists.
- Gmail REST client (`src/lib/gmail.ts`) with 429 backoff.
- Sender analytics (bucketed sampling); deduped unsubscribe list.
- RFC 8058 one-click unsubscribe + fallback links; explicit user click required.
- PostHog events: signup, returned, activated, email_opened, digest_generated, digest_exported.

### UI components shipped

- `Sidebar` — nav for all views; mobile drawer.
- `WorkSurface` — split list/detail layout.
- `TriageQueues` + `TriageActionBar` + `TriageStateBadge` + `TriageQueueLedger` + `TriageActionsProvider`.
- `EmailList`, `EmailDetail` — list rows with triage badges, thread reader, unsubscribe.
- `SemanticSearch` — model load, index sync, semantic query.
- `Subscriptions`, `Analytics`, `WeeklyDigestView`, `GmailFilterBuilder`.
- `Providers`, `posthog-provider.tsx`, `ErrorBoundary`.

### Shipped PRD batch (2026-06-12, closed 2026-06-20)

**Weekly digest (`#digest`):**
- `WeeklyDigestView` renders `buildWeeklyDigest()` from IndexedDB.
- Sections: quiet relationships, threads to revisit, weekly themes.
- Open sender → inbox search `from:`; open thread → subject search.
- `digestToTodayLittleLogExport()` clipboard copy (manual only).
- Fixtures: `fixtures/digest-sample-emails.json`, `fixtures/weekly-digest-sample.json`; verify via `pnpm digest:verify`.

**Triage action queue:**
- Shared `TriageQueueLedger` on Today + Inbox.
- `TriageActionBar`: summarize, defer (4h/EOD/1d), follow-up (3d/1w), reply, skip; undo.
- Deferred snooze visible on rows and detail via `buildActiveMap`.
- State in `localStorage` `email-manager:triage-actions:v1` (max 200 records).
- `TriageQueues` heuristic queues (newsletters, follow-ups, etc.) on `#today`.

**Gmail filter recipe studio (`#filters`):**
- Categories: newsletter, receipt, notification, follow-up.
- Per-recipe: match rationale, `suggestedActionLines`, `archiveImpactLabel`.
- Side-by-side: selected recipes, Gmail XML (`buildGmailFilterXml`), `buildRecipeExplanation`.
- Sample sizes: 100 / 500 / 1k inbox messages; local deterministic suggestions.

### Marketing (Astro `landing-astro/`)

- Static `/` landing: hero, features, CTA → `/app`.
- Built into `dist/index.html` — not separate Pages project.

### Tests

- Playwright: landing hero/features/CTA, no horizontal scroll, CTA touch target ≥44px (desktop + mobile).
- `pnpm digest:verify` golden-file check for digest builder.
- CI (`ci.yml`): lint + build only; weekly workflow adds typecheck + e2e.

## Todo / Planned / Deferred / Blocked

### Planned

1. IndexedDB `digests` store with 90-day retention (`src/lib/db.ts`; see `docs/plans/2026-06-04-email-memories-digest.md`).
2. Triage keyboard shortcuts and compact recent-actions panel (`src/components/TriageActionBar.tsx`).
3. Add e2e to `ci.yml` for signed-in flows (currently manual OAuth only).

### Deferred

- Server-side digest cron or email delivery.
- LLM-written digest prose.
- Automatic sync to Today Little Log (manual export only).
- Saved filter recipe presets.
- Commercial "personal reporter" positioning.
- Digest prefs in `localStorage` `email-manager:digest:*` (planned, not shipped).

### Blocked

- D1 bindings resolve only under `wrangler dev` / deployed worker — use `pnpm dev` or `pnpm dev:api` for `/api/*`.
- No unit/Vitest tests; signed-in flows require manual OAuth.
- `ci.yml` does not run e2e (weekly workflow does).
