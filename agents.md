# agents.md — email-manager

## Purpose
Email management app with semantic search — fully client-side ML via HuggingFace ONNX, emails stored in IndexedDB, no server DB. Status: done/stable.

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 (CSS custom properties for light/dark theming)
- DB: IndexedDB (client-side via `idb`) — emails and embeddings stored locally; no server DB
- Auth: NextAuth v4 (Google OAuth, `gmail.readonly` scope, offline access + manual token refresh)
- Testing: Playwright (e2e)
- Deploy: Vercel
- Package manager: pnpm

## Repo structure
```
src/
  app/
    page.tsx              # Main SPA (inbox/starred/sent/trash/subscriptions/analytics views)
    layout.tsx            # Root layout
    globals.css           # CSS vars for light/dark theming
    api/
      auth/[...nextauth]/ # NextAuth handler
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
    auth.ts               # NextAuth config + Google token refresh
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
- **No server-side database.** All email data and embeddings live in IndexedDB. API routes only proxy Gmail API calls.
- **Client-side ML**: HuggingFace Transformers (ONNX runtime) generates embeddings in-browser. `next.config.ts` aliases out `sharp` and `onnxruntime-node`, marks `@huggingface/transformers` as `serverExternalPackage`.
- **Semantic search confirmed working** — `SemanticSearch.tsx` and `lib/semantic-search.ts` are functional.
- **Single-page app pattern**: all views in `page.tsx` controlled by `view` state synced to URL hash.
- **Token refresh**: `lib/auth.ts` manually refreshes Google OAuth tokens in NextAuth `jwt` callback.
- **Rate limiting**: Gmail API retried on 429 with exponential backoff (1s/2s/4s); fetches batched in groups of 25.
- **Read-only**: `gmail.readonly` scope only. No compose/reply/archive/delete.
- **Unsubscribe**: RFC 8058 one-click POST + fallback browser-open for mailto/HTTP links.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Husky pre-push hook configured.
- **CF Workers auth fix (2026-04-25)**: NextAuth v4 `GoogleProvider` uses OIDC discovery via `https.request` (Node.js built-in), which is not available on CF Workers even with `nodejs_compat`. Fixed by providing explicit OAuth endpoints (`authorization.url`, `token`, `userinfo`, `idToken: true`) directly in `src/lib/auth.ts`, bypassing discovery entirely. Also changed `package.json` build script to `next build --webpack` (Turbopack doesn't resolve `@/` path aliases correctly with the inherited `@saas-maker/tsconfig`).
- **Remaining action needed**: Add `https://email-manager.sarthakagrawal927.workers.dev/api/auth/callback/google` as an authorized redirect URI in the Google Cloud Console OAuth app to complete the auth flow (currently hits `redirect_uri_mismatch`).

## Active context
