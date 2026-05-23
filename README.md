# Email Manager

Gmail inbox workspace with local-first semantic search. The app signs in with
Google, reads Gmail through the Gmail API, stores email metadata and embeddings
in the browser, and lets the user search, inspect, analyze, and unsubscribe
without persisting mailbox contents on the server.

Live app: <https://email-manager.sarthakagrawal927.workers.dev>

## What It Does

- Browse Gmail views for inbox, starred, sent, trash, subscriptions, and analytics.
- Search normal email metadata and run semantic search over locally generated embeddings.
- Generate embeddings in-browser with Hugging Face Transformers / ONNX.
- Keep email data and embeddings in IndexedDB instead of a server database.
- Proxy Gmail reads through API routes with retry handling for rate limits.
- Surface sender analytics and deduplicated unsubscribe candidates.
- Unsubscribe through RFC 8058 one-click POST where available, with fallback links.

## Privacy Model

The server does not store email bodies, email lists, or generated embeddings.
Cloudflare D1 stores only better-auth tables for login/session state. Gmail data
is fetched on demand and cached locally in IndexedDB inside the browser.

## Deployment & External Services

| Concern | Service |
|---------|---------|
| Hosting | Cloudflare Workers (`email-manager`, email-manager.sarthakagrawal927.workers.dev) via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (`email-manager-auth`) for auth, via Drizzle ORM; email data + embeddings stored client-side in IndexedDB |
| Auth | better-auth + Google OAuth |
| Analytics | PostHog (`@saas-maker/posthog-client`) |
| AI | `@huggingface/transformers` — runs client-side in the browser for semantic search |
| CI/CD | GitHub Actions — auto-deploy to Cloudflare Workers on push to `main` |

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The local app runs at <http://localhost:3000>.

Required environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

Google OAuth must allow the local and production callback URLs:

- `http://localhost:3000/api/auth/callback/google`
- `https://email-manager.sarthakagrawal927.workers.dev/api/auth/callback/google`

## Scripts

- `pnpm dev` — `next dev`
- `pnpm build` — `next build`
- `pnpm start` — `next start`
- `pnpm typecheck` — TypeScript check
- `pnpm lint` — currently aliases to `pnpm typecheck`
- `pnpm test:e2e` — Playwright e2e suite
- `pnpm cf:build` — OpenNext Cloudflare build
- `pnpm deploy` — build and deploy to Cloudflare Workers

## Architecture

```text
src/app/                 Next.js App Router pages and API routes
src/app/api/auth/        better-auth handler
src/app/api/emails/      Gmail proxy endpoints
src/components/          mailbox, search, analytics, unsubscribe UI
src/lib/auth.ts          better-auth + Google token refresh
src/lib/gmail.ts         Gmail REST client with 429 backoff
src/lib/db.ts            IndexedDB schema and helpers
src/lib/embeddings.ts    browser-side embedding model loading
src/lib/semantic-search.ts
tests/                   Playwright coverage
```

Key constraints:

- Gmail OAuth scope is read-only.
- Email content and embeddings stay client-side.
- Hugging Face Transformers must remain browser-safe; avoid adding Node-only ML dependencies.
- `next build --webpack` is used for the production build path because the Cloudflare/OpenNext stack depends on webpack-compatible output.

## Verification

Before changing behavior, run the smallest relevant check:

```bash
pnpm typecheck
pnpm build
pnpm test:e2e
```

For deployment work, also run:

```bash
pnpm cf:build
```

## Current Status

Stable maintenance app. The remaining production setup footgun is Google OAuth:
the deployed callback URL must be present in the Google Cloud Console OAuth app,
otherwise sign-in fails with `redirect_uri_mismatch`.

See `agents.md` for implementation conventions and deeper architecture notes.
