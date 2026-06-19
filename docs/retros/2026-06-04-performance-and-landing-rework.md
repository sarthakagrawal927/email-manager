# Retro: Performance Pass + Landing Rework

**Date:** 2026-06-04 (cluster of commits, same day)
**Phase:** Stable app → edge-cached landing + critical-CSS inlining

---

## What happened

A psi-swarm Lighthouse audit flagged 4.6s LCP on mobile-mid with high render delay.
The fix became a chain of build-pipeline changes that landed over a single day:

1. **Static rendering of `/`** — the homepage was converted from SSR to static (`make / statically renderable`).
2. **Beasties critical-CSS inlining** — `inline-critical-css.mjs` added to the build; required discovering the exact ordering with `--skipNextBuild` (lesson 15 in `docs/lessons.md`).
3. **OpenNext static-assets incremental cache** — `open-next.config.ts` switched to `staticAssetsIncrementalCache` so the Beasties-modified HTML actually reached browsers.
4. **Custom `worker.mjs` edge cache** — `caches.default` wraps the OpenNext handler for GET `/` to skip the cold-start path entirely.
5. **Smart Placement** — `[placement] mode = "smart"` added to `wrangler.toml` to reduce D1 auth latency.
6. **Astro landing overlay** — a separate `landing-astro` workspace was built and `overlay-astro-landing.mjs` injected its compiled HTML as `.open-next/assets/index.html`, reducing anon GET `/` TTFB from ~250ms to ~30ms.

The `worker.mjs` double-gzip bug (`encodeBody` default) was introduced and fixed within
the same cluster; see `docs/lessons.md` lesson 20.

---

## What went well

- Each individual optimization was measurable: Smart Placement, edge cache HIT header,
  and the Astro overlay each had a clear TTFB improvement.
- The `x-edge-cache: HIT/MISS/ASSET` header added to responses made it easy to verify
  the cache path in production without instrumenting workers logs.
- The Beasties inlining worked correctly on the first attempt once the ordering issue
  was understood.

## What went wrong

- The build pipeline is now a 7-step sequence with several fragile inter-dependencies
  (see `docs/decisions.md` ADR-007). A single step failure produces an opaque build error.
- The double-gzip bug shipped briefly to production before being caught (2026-06-05
  follow-up commit). The root cause (`encodeBody: "automatic"` default) is not documented
  in CF Workers docs prominently.
- The `cf-build.mjs` pnpm sparse-install workaround (lesson 14 in `docs/lessons.md`)
  was already necessary at this point, adding another implicit dependency on the Fleet
  workspace structure.

## Lessons taken forward

- `encodeBody: "manual"` when streaming already-compressed bytes. See lesson 20.
- Beasties must run before `--skipNextBuild`. See lesson 15.
- Consider a build smoke-test that verifies `x-edge-cache: ASSET` on a local `wrangler dev`
  run before deploying, to catch double-compression or cache miss regressions early.
