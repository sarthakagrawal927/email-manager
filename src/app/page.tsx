import HomeClient from "./HomeClient";

// No `revalidate` — the homepage is fully static (HomeClient is the
// hydration shell; email data lives in IndexedDB). Without revalidate
// the route is pure SSG: OpenNext serves the Beasties-inlined HTML
// from .open-next/cache/<id>/index.cache directly on every request,
// without going through the ISR re-render path that x-nextjs-cache
// MISS triggers. Edge caching is set via next.config headers() instead.

export default function Page() {
  return <HomeClient />;
}
