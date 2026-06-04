import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Root route `/` — marketing landing fallback.
//
// In production the Astro static landing at landing-astro/dist/index.html
// is overlaid into .open-next/assets/ by scripts/overlay-astro-landing.mjs
// and served by the Worker's ASSETS binding for anon GET / (see
// worker.mjs → env.ASSETS short-circuit). This Next.js route is only
// invoked when:
//   - the request has an auth cookie (worker.mjs falls through to
//     OpenNext so we can redirect signed-in users to /app), OR
//   - the ASSETS lookup misses (defensive fallback).
//
// We perform a server-side redirect to /app for the auth case (no
// client flash, no CSP risk) and a basic marketing fallback for the
// asset-miss case. The real landing is the Astro overlay; do NOT pull
// HomeClient back in here.

const AUTH_COOKIE_FRAGMENTS = ["session_token", "session-token"];

export default async function Page() {
  const store = await cookies();
  const hasAuthCookie = store
    .getAll()
    .some((c) => AUTH_COOKIE_FRAGMENTS.some((needle) => c.name.includes(needle)));

  if (hasAuthCookie) {
    redirect("/app");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
        Kinetic — Triage Gmail without giving up control.
      </h1>
      <p style={{ margin: 0, maxWidth: 540, opacity: 0.7 }}>
        Read-only Gmail cockpit. Triage by sender behavior, search
        semantically in-browser, export Gmail filters.
      </p>
      <Link
        href="/app"
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
          padding: "0 22px",
          borderRadius: 10,
          background: "#24389c",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Open Kinetic
      </Link>
    </main>
  );
}
