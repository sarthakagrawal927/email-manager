# agents.md — email-manager

## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

## Purpose
Email management app with semantic search — fully client-side ML via HuggingFace ONNX, emails stored in IndexedDB, no server DB. Status: done/stable.

## Stack
- Framework: Vite + React 19 SPA (client-side routing via `react-router-dom`) + Hono Worker (`src/worker.ts`)
- Language: TypeScript
- Styling: Tailwind CSS v4 (CSS custom properties for light/dark theming)
- DB: Cloudflare D1 `email-manager-auth` (auth tables, Drizzle) + IndexedDB (client-side via `idb`) — emails and embeddings stored locally
- Auth: better-auth (Google OAuth, `gmail.readonly` scope, offline access + manual token refresh)
- Testing: Vitest (unit), Playwright (e2e)
- Deploy: Cloudflare Workers (`email-manager`) — `pnpm build` (Vite + Astro landing overlay) + `wrangler deploy`
- Package manager: pnpm

## Repo structure
```
src/
  worker.ts               # Hono Worker entry — /api/* routing, asset serving
  main.tsx                # SPA entry point
  router.tsx              # React Router routes
  RootLayout.tsx          # Root layout
  pages/                  # Route page components
  components/
    Providers.tsx         # SessionProvider wrapper
    Sidebar.tsx           # Nav
    EmailList.tsx         # Email list with search + infinite scroll
    EmailDetail.tsx       # Email viewer (sandboxed HTML iframe) + unsubscribe
    Subscriptions.tsx     # Deduplicated unsubscribeable senders
    Analytics.tsx         # Sender frequency analysis (bar charts)
    SemanticSearch.tsx    # In-browser vector search UI (confirmed working)
    WorkSurface.tsx       # Triage work surface
    WeeklyDigestView.tsx  # Weekly digest view
  lib/
    auth.ts               # better-auth config + Google token refresh
    gmail.ts              # Gmail REST API client (exponential backoff on 429)
    db.ts                 # IndexedDB schema + helpers
    embeddings.ts         # HuggingFace Transformers ONNX (in-browser)
    semantic-search.ts    # Cosine similarity search over stored embeddings
    digest.ts             # Weekly digest builder (pure)
  db/
    schema.ts             # Drizzle schema (D1 auth tables)
landing-astro/            # Astro landing page (overlaid into deploy via cf:build)
vite.config.ts            # Vite SPA build config
wrangler.toml             # Worker config: main=src/worker.ts
```

## Key commands
```bash
pnpm dev        # Vite SPA (:5173) + wrangler dev (:8787) concurrently
pnpm dev:api    # wrangler dev only (Worker, port 8787)
pnpm dev:spa    # Vite only (port 5173, proxies /api → 8787)
pnpm build      # Vite build + Astro landing overlay → dist/
pnpm lint       # biome check .
pnpm test       # vitest run
```

## Architecture notes
- **No server-side email storage.** All email data and embeddings live in IndexedDB; API routes only proxy Gmail API calls. Cloudflare D1 (`email-manager-auth`) holds only better-auth tables.
- **Client-side ML**: HuggingFace Transformers (ONNX runtime) generates embeddings in-browser.
- **Semantic search confirmed working** — `SemanticSearch.tsx` and `lib/semantic-search.ts` are functional.
- **Token refresh**: `lib/get-access-token.ts` refreshes expired Google OAuth tokens via better-auth's `auth.api.getAccessToken` (refresh token stored thanks to `accessType: "offline"`).
- **Rate limiting**: Gmail API retried on 429 with exponential backoff (1s/2s/4s); fetches batched in groups of 25.
- **Read-only**: `gmail.readonly` scope only. No compose/reply/archive/delete.
- **Unsubscribe**: RFC 8058 one-click POST + fallback browser-open for mailto/HTTP links.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- **OAuth redirect URI**: `https://mail.sassmaker.com/api/auth/callback/google` registered in Google Cloud Console (2026-06-28).

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
