import HomeClient from "./HomeClient";

// Static shell — HomeClient hydrates the auth + Gmail UI on the client.
// Dropping `force-dynamic` lets the Worker return a pre-rendered HTML
// envelope instead of re-running the route per request. Email data lives
// in IndexedDB (zero server reads), so SSR was buying nothing but TTFB.
export default function Page() {
  return <HomeClient />;
}
