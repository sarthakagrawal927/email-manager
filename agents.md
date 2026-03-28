# Email Manager

Gmail client web app -- read, search, analyze, and unsubscribe from emails via the Gmail API.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 4 (via PostCSS plugin, CSS custom properties for theming)
- **Auth**: NextAuth v4 with Google OAuth (gmail.readonly scope, token refresh flow)
- **API**: Gmail REST API (no SDK -- raw fetch with retry/backoff in `src/lib/gmail.ts`)
- **SaaS tooling**: @saas-maker/sdk, @saas-maker/feedback, @saas-maker/testimonials, @saas-maker/changelog-widget
- **Package manager**: pnpm
- **Deployment**: Vercel

## Architecture

```
src/
  app/
    layout.tsx              # Root layout: Providers + SaasMaker widgets
    page.tsx                # Main SPA -- all views (inbox/starred/sent/trash/subscriptions/analytics)
    globals.css             # CSS vars for light/dark theming
    api/
      auth/[...nextauth]/route.ts   # NextAuth handler
      emails/route.ts               # GET /api/emails -- list/search with pagination
      emails/[id]/route.ts          # GET /api/emails/:id -- single email full body
      emails/[id]/unsubscribe/route.ts  # POST -- RFC 8058 one-click unsubscribe
  components/
    Providers.tsx           # SessionProvider wrapper
    Sidebar.tsx             # Nav sidebar (inbox/starred/sent/trash/subscriptions/analytics)
    EmailList.tsx           # Email list with search + infinite scroll
    EmailDetail.tsx         # Email viewer with HTML iframe + unsubscribe button
    Subscriptions.tsx       # Deduplicated unsubscribe-able senders list
    Analytics.tsx           # Sender frequency analysis (50-5k emails, bar chart, expandable)
    SaasMakerAnalytics.tsx  # Page view tracking
    saasmaker-feedback.tsx  # Feedback widget + testimonials + changelog
  lib/
    auth.ts                 # NextAuth config (Google provider, JWT callbacks, token refresh)
    gmail.ts                # Gmail API helpers (listEmails, getEmail, parseMessage, rate-limit retry)
    saasmaker.ts            # SaasMaker SDK client init
```

## Key Conventions

- **Single-page app**: All views rendered in `page.tsx` controlled by `view` state synced to URL hash (`#inbox`, `#analytics`, etc.)
- **No database**: Stateless -- all data comes from Gmail API per-request. No local storage or caching (except in-memory `cacheRef` for analytics).
- **Server-side auth check**: Every API route calls `getServerSession()` and reads `session.accessToken` to proxy Gmail API calls.
- **Theming**: CSS custom properties (`--bg`, `--text`, `--accent`, etc.) with `prefers-color-scheme` media query.
- **No external state management**: Plain React state + `useCallback`/`useRef`.
- **Path alias**: `@/*` maps to `./src/*`
- **Email parsing**: Body decoded from base64url, prefers HTML over plaintext, handles nested MIME parts.
- **Unsubscribe**: Supports RFC 8058 one-click POST and fallback to opening unsubscribe URL in browser.

## Commands

```bash
pnpm dev        # Start dev server (localhost:3000)
pnpm build      # Production build
pnpm start      # Serve production build
pnpm lint       # ESLint
```

## Environment Variables

```
GOOGLE_CLIENT_ID          # Google OAuth client ID
GOOGLE_CLIENT_SECRET      # Google OAuth client secret
NEXTAUTH_SECRET           # Random secret for JWT encryption
NEXTAUTH_URL              # App URL (http://localhost:3000 for dev)
NEXT_PUBLIC_SAASMAKER_API_KEY  # SaasMaker project key (optional)
```

## Current State

**Done:**
- Google OAuth sign-in with token refresh
- Email listing with label filtering (inbox/starred/sent/trash)
- Search (Gmail query syntax)
- Paginated loading (infinite scroll)
- Email detail view with sandboxed HTML rendering
- Subscription management (deduplicated by sender domain, one-click unsubscribe)
- Sender analytics with configurable sample size (50-5k), bar charts, expandable email lists
- Light/dark theme (system preference)
- SaasMaker feedback widget + analytics tracking

**Not done:**
- No tests
- No compose/reply/draft functionality (read-only -- gmail.readonly scope)
- No email actions (archive, delete, label, mark read/unread)
- No offline support or local caching
