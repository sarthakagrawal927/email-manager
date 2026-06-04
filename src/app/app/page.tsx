import HomeClient from "./HomeClient";

// /app — the full SPA cockpit (formerly mounted at /).
//
// Moved out of `/` so the marketing landing (Astro static, overlaid
// onto .open-next/assets/index.html by scripts/overlay-astro-landing.mjs)
// can take the LCP path. Auth-bearing requests still hit OpenNext for
// `/app` so server-rendered shell + client hydration work as before.
// HomeClient handles the unauthenticated branch by redirecting back
// to `/`.

export default function Page() {
  return <HomeClient />;
}
