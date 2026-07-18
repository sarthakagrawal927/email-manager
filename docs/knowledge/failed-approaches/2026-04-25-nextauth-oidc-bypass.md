# Failed Approach: NextAuth OIDC Discovery Bypass

**Date:** Pre-2026-04-25 (original patch); replaced 2026-04-25
**Status:** Replaced by better-auth

## What was tried

Using NextAuth.js (v4) with a hand-rolled "bypass OIDC discovery" patch. The
patch was necessary because CF Workers' edge runtime timed out on the
`.well-known/openid-configuration` fetch during cold starts — NextAuth's OIDC
discovery step could not complete within the Workers startup budget.

## Why it did not ship (as a long-term solution)

The bypass patch was fragile and accumulated tech debt:

- The actual failure mode (cold-start timeout on `.well-known` fetch) was only
  documented after the fact.
- Diagnosing the root cause was non-obvious because the patch masked the
  symptom.
- Each NextAuth or Workers runtime update risked breaking the bypass.

## What replaced it

`better-auth` with the `drizzleAdapter` pointing at D1 (2026-04-25 migration).
better-auth avoids OIDC discovery entirely in favor of direct Google OAuth
endpoints. It also provides first-class offline-access/refresh-token support
via `accessType: "offline"` + `prompt: "consent"`, enabling
`auth.api.getAccessToken` to transparently renew expired tokens.

## When it could be revisited

Never. better-auth is the canonical auth layer. NextAuth.js v5 (Auth.js) was
considered as an alternative but not chosen (rationale TBD — see ADR-005).

## Related

- [`../../architecture/decisions.md`](../../architecture/decisions.md) ADR-005
  (better-auth with Google OAuth).
- [`../../retros/2026-04-25-cf-workers-migration.md`](../../retros/2026-04-25-cf-workers-migration.md).
- [`../learnings/lessons.md`](../learnings/lessons.md) lesson 17 (NextAuth
  OIDC fix was fragile; better-auth was cleaner).
