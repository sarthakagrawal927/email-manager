import { NextResponse, type NextRequest } from "next/server";

/**
 * Force CF Edge to cache the static homepage. OpenNext emits
 * `Cache-Control: s-maxage=3600` which CF was treating as DYNAMIC for HTML.
 * Adding an explicit max-age (browser cache) plus CDN-Cache-Control is the
 * combination CF Edge actually honors for HTML responses.
 *
 * Auth, Gmail, and triage all happen client-side (IndexedDB), so the
 * HTML envelope is the same for every visitor and safe to cache for hours.
 */
export function middleware(req: NextRequest) {
  if (req.method !== "GET" || req.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  res.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  res.headers.set(
    "CDN-Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return res;
}

export const config = {
  matcher: "/",
};
