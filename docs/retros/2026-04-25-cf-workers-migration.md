# Retro: Cloudflare Workers Migration + Auth Rewrite

**Date:** 2026-04-25
**Phase:** Server-inference → client-ML, CF Pages → CF Workers, NextAuth → better-auth

---

## What happened

A single day of commits (2026-04-25) rewired three major infrastructure pieces simultaneously:

1. **Deploy target:** CF Workers → CF Pages → back to CF Workers, same day. Pages was
   tried because the OpenNext docs listed it as supported, but Pages does not expose the
   Workers runtime APIs (`caches.default`, Durable Object exports) that the custom
   worker entry and OpenNext's D1/DO bindings need. Reverted within hours.

2. **Auth:** NextAuth → better-auth. The proximate cause was a stale workaround — a
   hand-rolled "bypass OIDC discovery" patch that kept breaking under CF Workers' cold-start
   fetch timeouts. better-auth's Drizzle adapter + direct OAuth endpoints removed the
   fragile OIDC discovery step entirely.

3. **Semantic search landing:** The `feat: add local semantic email search` commit
   (2026-04-02) landed the Transformers.js / ONNX in-browser embedding pipeline. The
   April 25 hardening pass locked down the webpack aliases and `serverExternalPackages`
   entries that prevent the ONNX runtime from entering the Worker bundle.

---

## What went well

- better-auth's `drizzleAdapter` for D1 required almost no custom code; the migration was
  straightforward once the decision was made.
- The CF Workers target proved more capable than Pages for this use case; the migration
  cost was high but the right call.
- `accessType: "offline"` + `prompt: "consent"` on the Google provider immediately
  solved the refresh-token gap that had been causing silent auth failures.

## What went wrong

- Trying CF Pages first without validating Workers API compatibility added half a day of
  throwaway work. The OpenNext docs were ambiguous about which APIs were Pages-compatible.
- The NextAuth OIDC bypass had accumulated tech debt that made diagnosing the root
  cause non-obvious. The actual failure mode (cold-start timeout on `.well-known` fetch)
  was only documented after the fact.
- Three infrastructure changes in one day made bisecting any deploy failure difficult.
  Subsequent commits on the same day had to clean up drift in `wrangler.toml` and CI.

## Lessons taken forward

- Validate CF runtime API compatibility before committing to a deploy target.
  See [`../knowledge/learnings/lessons.md`](../knowledge/learnings/lessons.md) lesson 13.
- Refresh-token silent expiry is now handled by `auth.api.getAccessToken`;
  raw D1 token lookups are gone. See [`../knowledge/learnings/lessons.md`](../knowledge/learnings/lessons.md) lessons 17–18.
- Keep auth, deploy target, and ML pipeline changes in separate PRs when possible.
