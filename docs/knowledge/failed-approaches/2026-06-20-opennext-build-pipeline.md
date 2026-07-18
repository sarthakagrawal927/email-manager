# Failed Approach: OpenNext + Beasties Build Pipeline

**Date:** 2026-04-25 through 2026-06-20 (iterative); replaced 2026-06-20
**Status:** Replaced by Vite SPA + Hono Worker (De-OpenNext migration)

## What was tried

Using `@opennextjs/cloudflare` to adapt the Next.js build for Cloudflare
Workers, with a complex multi-step build pipeline:

1. Patch OpenNext internals (`patches/opennext-cloudflare-externals.js`).
2. `next build`.
3. Beasties critical-CSS inlining (`scripts/inline-critical-css.mjs`).
4. OpenNext `--skipNextBuild` pass.
5. `populateCache` workaround.
6. Astro landing build.
7. `scripts/overlay-astro-landing.mjs` to replace the OpenNext-rendered `/`
   with a pre-built Astro static page.
8. `scripts/cf-build.mjs` workaround to copy full Next.js dist into
   `.next/node_modules/.pnpm` store (pnpm sparse install dropped files
   OpenNext's esbuild needed).

## Why it did not ship (as a long-term solution)

The pipeline was extremely fragile:

- **7+ sequential steps** with opaque inter-dependencies. Any step failure
  produced an opaque build error.
- **String-replacement patch** on a minified OpenNext file
  (`bundle-server.js`). If OpenNext reformatted or renamed the target string,
  the patch logged `patch target not found` and exited 1, blocking `cf:build`.
- **pnpm sparse install workaround** depended on the Fleet workspace pnpm
  store structure. Re-verification needed on every Next.js upgrade.
- **Beasties ordering** had to run before `--skipNextBuild` or the modified
  HTML never reached the asset bundle.
- **Double-gzip bug** shipped briefly to production (`encodeBody: "automatic"`
  default re-compressed already-gzipped Astro HTML — see lesson 20).

## What replaced it

Vite SPA + Hono Worker (2026-06-20 "De-OpenNext migration"):

- `vite build` → `dist/spa-index.html` (SPA shell).
- `pnpm build:landing` (Astro → `landing-astro/dist/`).
- `scripts/overlay-landing.mjs` → `dist/index.html` (Astro landing overlaid).
- `wrangler deploy` (Hono Worker serves assets + `/api/*`).

The entire OpenNext/Beasties/patch/cf-build pipeline was removed. The build is
now 3 steps with no patches.

## What was removed

- `worker.mjs` (custom OpenNext worker entry)
- `open-next.config.ts`
- `scripts/cf-build.mjs`
- `scripts/inline-critical-css.mjs`
- `scripts/overlay-astro-landing.mjs` (replaced by simpler `overlay-landing.mjs`)
- `patches/opennext-cloudflare-externals.js`
- `@opennextjs/cloudflare` dependency
- `next`, `react`, `react-dom` (re-added for Vite SPA, different config)
- `eslint`, `eslint-config-next` (replaced by Biome)

## When it could be revisited

Never. The Vite + Hono stack is simpler, faster to build, and has no patches.
OpenNext would only return if the app needed Next.js SSR, server actions, or
per-route caching — none of which apply to a client-side SPA with a read-only
Gmail proxy.

## Related

- [`../../architecture/decisions.md`](../../architecture/decisions.md) ADR-004
  (CF Workers + D1) and ADR-007 (OpenNext pipeline — marked Superseded).
- [`../../retros/2026-06-04-performance-and-landing-rework.md`](../../retros/2026-06-04-performance-and-landing-rework.md).
- [`../learnings/lessons.md`](../learnings/lessons.md) lessons 9, 14–16, 20
  (historical context from this pipeline).
