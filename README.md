# Email manager

## Deployment & External Services

| Concern | Service |
|---------|---------|
| Hosting | Cloudflare Workers (`email-manager`, email-manager.sarthakagrawal927.workers.dev) via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (`email-manager-auth`) for auth, via Drizzle ORM; email data + embeddings stored client-side in IndexedDB |
| Auth | better-auth + Google OAuth |
| Analytics | PostHog (`@saas-maker/posthog-client`) |
| AI | `@huggingface/transformers` — runs client-side in the browser for semantic search |
| CI/CD | GitHub Actions — auto-deploy to Cloudflare Workers on push to `main` |

## Setup

```bash
pnpm install
cp .env.example .env  # fill in values
pnpm dev
```

## Scripts

- `pnpm dev` — `next dev`
- `pnpm start` — `next start`
- `pnpm build` — `next build`
- `pnpm lint` — `next lint`

## Notes

See `AGENTS.md` / `agents.md` for architecture.
