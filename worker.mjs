// worker.mjs — custom Worker entry that wraps OpenNext with edge cache.
//
// The OpenNext-generated worker (`./.open-next/worker.js`) is imported as
// the inner handler. For GET / requests we consult `caches.default` first
// and only fall through to the Next handler on a miss — eliminating the
// Worker cold-start path entirely for warm-cache hits on the homepage.
//
// Cache headers are explicit so CF Edge actually treats the response as
// cacheable (s-maxage-only was getting marked DYNAMIC at the zone level;
// using caches.default sidesteps the zone-level Cache Rules requirement).
//
// All non-GET, non-`/` requests pass straight through to OpenNext.

import openNext from "./.open-next/worker.js";

// Durable Objects must be re-exported from the entry that wrangler.toml
// points at, otherwise the bindings can't resolve them at deploy time.
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";

const CACHE_PATH = "/";
const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") {
      return openNext.fetch(request, env, ctx);
    }
    const url = new URL(request.url);
    if (url.pathname !== CACHE_PATH) {
      return openNext.fetch(request, env, ctx);
    }

    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) {
      // Clone so we can mark it; original cached Response body is locked.
      const hit = new Response(cached.body, cached);
      hit.headers.set("x-edge-cache", "HIT");
      return hit;
    }

    const response = await openNext.fetch(request, env, ctx);

    // Only cache 2xx HTML responses — never error pages or redirects.
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status !== 200 || !contentType.includes("text/html")) {
      return response;
    }

    const cacheable = new Response(response.body, response);
    cacheable.headers.set("Cache-Control", CACHE_CONTROL);
    cacheable.headers.set("x-edge-cache", "MISS");
    ctx.waitUntil(cache.put(request, cacheable.clone()));
    return cacheable;
  },
};
