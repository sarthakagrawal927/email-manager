# Runbook: Local Dev Setup

## Prerequisites

- Node ≥ 22 (matches CI).
- pnpm 10.33.2 (pinned in `package.json` `packageManager`).
- Google OAuth credentials (see [`oauth-setup.md`](oauth-setup.md)).

## Steps

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Create `.dev.vars` with secrets:**

   ```bash
   cp .env.example .dev.vars
   # Edit .dev.vars with real GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
   # BETTER_AUTH_SECRET, BETTER_AUTH_URL=http://localhost:8787
   ```

   Or run the setup script:

   ```bash
   pnpm setup:dev    # node scripts/setup-dev.mjs
   ```

3. **(Optional) Set PostHog key for client analytics:**

   Create `.env.local` with `VITE_POSTHOG_KEY=phc_your-key`.

4. **Ensure OAuth callback is registered:**

   `http://localhost:8787/api/auth/callback/google` must be in Google Cloud
   Console. See [`oauth-setup.md`](oauth-setup.md).

5. **Start dev servers:**

   ```bash
   pnpm dev
   ```

   This runs two processes concurrently:
   - Vite at http://localhost:5173 (SPA; proxies `/api/*` → :8787)
   - Wrangler at http://localhost:8787 (Hono API + assets)

6. **Open the app:**

   http://localhost:5173 — SPA shell.
   http://localhost:8787 — production-like (Astro landing at `/` + API).

## Production-like local stack

For a full production-like stack (Astro landing at `/` + API), build first:

```bash
pnpm build
pnpm dev:api
```

Open http://localhost:8787.

## Troubleshooting

- **`/api/*` returns errors in Vite-only mode:** D1 bindings resolve only under
  `wrangler dev`. Use `pnpm dev` (not `pnpm dev:spa`) for `/api/*` routes.
- **`redirect_uri_mismatch` on sign-in:** OAuth callback URL not registered in
  Google Cloud Console. See [`oauth-setup.md`](oauth-setup.md).
- **Silent auth failures after 1 hour:** Token refresh handled by
  `auth.api.getAccessToken` — if failing, check that `accessType: "offline"` and
  `prompt: "consent"` are set in `src/lib/auth.ts`.
