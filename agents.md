# agents.md — email-manager

## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

## Purpose
Email management app with semantic search — fully client-side ML via HuggingFace ONNX, emails stored in IndexedDB, no server DB. Status: done/stable.

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 (CSS custom properties for light/dark theming)
- DB: Cloudflare D1 `email-manager-auth` (auth tables, Drizzle) + IndexedDB (client-side via `idb`) — emails and embeddings stored locally
- Auth: better-auth (Google OAuth, `gmail.readonly` scope, offline access + manual token refresh)
- Testing: Playwright (e2e)
- Deploy: Cloudflare Workers (`email-manager`) via `@opennextjs/cloudflare`
- Package manager: pnpm

## Repo structure
```
src/
  app/
    page.tsx              # Main SPA (inbox/starred/sent/trash/subscriptions/analytics views)
    layout.tsx            # Root layout
    globals.css           # CSS vars for light/dark theming
    api/
      auth/[...all]/      # better-auth handler
      emails/             # GET list/search, GET :id, POST :id/unsubscribe
  components/
    Providers.tsx         # SessionProvider wrapper
    Sidebar.tsx           # Nav
    EmailList.tsx         # Email list with search + infinite scroll
    EmailDetail.tsx       # Email viewer (sandboxed HTML iframe) + unsubscribe
    Subscriptions.tsx     # Deduplicated unsubscribeable senders
    Analytics.tsx         # Sender frequency analysis (bar charts)
    SemanticSearch.tsx    # In-browser vector search UI (confirmed working)
    SaasMakerAnalytics.tsx
    saasmaker-feedback.tsx
  lib/
    auth.ts               # better-auth config + Google token refresh
    gmail.ts              # Gmail REST API client (exponential backoff on 429)
    db.ts                 # IndexedDB schema + helpers
    embeddings.ts         # HuggingFace Transformers ONNX (in-browser)
    semantic-search.ts    # Cosine similarity search over stored embeddings
    saasmaker.ts          # SaasMaker SDK
tests/
  example.spec.ts         # Playwright e2e
```

## Key commands
```bash
pnpm dev      # next dev (localhost:3000)
pnpm build    # next build
pnpm start    # next start
pnpm lint     # next lint
```

## Architecture notes
- **No server-side email storage.** All email data and embeddings live in IndexedDB; API routes only proxy Gmail API calls. Cloudflare D1 (`email-manager-auth`) holds only better-auth tables.
- **Client-side ML**: HuggingFace Transformers (ONNX runtime) generates embeddings in-browser. `next.config.ts` aliases out `sharp` and `onnxruntime-node`, marks `@huggingface/transformers` as `serverExternalPackage`.
- **Semantic search confirmed working** — `SemanticSearch.tsx` and `lib/semantic-search.ts` are functional.
- **Single-page app pattern**: all views in `page.tsx` controlled by `view` state synced to URL hash.
- **Token refresh**: `lib/get-access-token.ts` refreshes expired Google OAuth tokens via better-auth's `auth.api.getAccessToken` (refresh token stored thanks to `accessType: "offline"`).
- **Rate limiting**: Gmail API retried on 429 with exponential backoff (1s/2s/4s); fetches batched in groups of 25.
- **Read-only**: `gmail.readonly` scope only. No compose/reply/archive/delete.
- **Unsubscribe**: RFC 8058 one-click POST + fallback browser-open for mailto/HTTP links.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- Husky pre-push hook configured.
- **CF Workers auth**: Auth runs on better-auth (Google OAuth) with auth tables in Cloudflare D1 (`email-manager-auth`) via Drizzle. `next build` build script may use `--webpack` (Turbopack doesn't resolve `@/` path aliases correctly with the inherited `@saas-maker/tsconfig`).
- **Remaining action needed**: Add `https://email-manager.sarthakagrawal927.workers.dev/api/auth/callback/google` as an authorized redirect URI in the Google Cloud Console OAuth app to complete the auth flow (currently hits `redirect_uri_mismatch`).

<!-- FLEET-GUIDANCE:START -->

## Fleet Guidance

### Adding Tasks
- Add durable work items in SaaS Maker Cockpit Tasks when the task affects product behavior, deployment, user feedback, or fleet maintenance.
- Include the project slug, a concise title, acceptance criteria, priority/status, and links to relevant code, issues, traces, or dashboards.
- If task discovery starts locally in an editor or agent session, mirror the durable next step back into SaaS Maker before handoff.

### Using SaaS Maker
- Treat SaaS Maker as the system of record for project metadata, feedback, tasks, analytics, testimonials, changelog, and fleet visibility.
- Prefer API-first workflows through `fnd api`, the SDK, or widgets instead of one-off scripts when interacting with SaaS Maker features.
- Keep this agent file aligned with the project record when operating rules, integrations, or deployment conventions change.

### Free AI First
- Prefer free/local AI paths for routine development and analysis: the `free-ai` gateway, local models, provider free tiers, and cached context.
- Escalate to paid models only when complexity, correctness risk, or missing capability justifies the cost.
- Note any paid-AI use in the task or handoff when it materially affects cost, reproducibility, or future maintenance.

<!-- FLEET-GUIDANCE:END -->

## Active context

- **Email memories / weekly digest** — planned in `docs/plans/2026-06-04-email-memories-digest.md`; pure builder in `src/lib/digest.ts`, fixtures in `fixtures/`. Verify: `pnpm dlx tsx scripts/verify-digest-fixture.mjs`. No `#digest` UI yet.
