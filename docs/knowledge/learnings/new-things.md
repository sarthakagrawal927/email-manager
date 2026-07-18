# new-things — study queue

Short stubs for non-standard tech in this repo. 3–5 lines each. Fill `Why here:`
yourself after learning; never invent rationale.

## HuggingFace Transformers.js (ONNX in-browser)
- What: Run ONNX models client-side via WebAssembly — no server inference required
- Why here: TBD
- Gotcha (from code): `src/lib/embeddings.ts` — escaping the onnxruntime-node native binary requires aliasing it out in the Vite build config; the browser only needs the WASM backend
- Source: https://huggingface.co/docs/transformers.js/index

## ONNX Runtime: SIMD, threading, and CSP
- What: WASM ONNX can be multi-threaded but requires `SharedArrayBuffer` + specific COOP/COEP headers; CSP `connect-src` must whitelist HuggingFace CDN shards
- Why here: TBD
- Gotcha (from code): a too-narrow CSP silently blocks the model fetch with an error that looks like an ONNX crash, not a network error
- Source: https://onnxruntime.ai/docs/get-started/with-javascript/web.html

## fp32 vs int8 model choice
- What: `dtype: "fp32"` gives reliable accuracy; quantized variants (int8, q4) are smaller/faster but had reported accuracy regressions in early Transformers.js v3
- Why here: TBD
- Gotcha (from code): `src/lib/embeddings.ts` uses `{ dtype: "fp32" }` explicitly to avoid the quantization accuracy hit
- Source: https://huggingface.co/docs/transformers.js/index

## IndexedDB as primary store (privacy-by-design)
- What: Storing email bodies and embeddings exclusively in the browser means zero server-side mailbox data — no GDPR/CCPA storage obligations for email content
- Why here: TBD
- Gotcha (from code): `src/lib/db.ts` opens DB `"email-search"` via the `idb` library; `StoredEmail` type includes `embedding: number[] | null` alongside the full body. D1 holds only auth tables
- Source: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

## Drizzle ORM on D1
- What: Lightweight TypeScript ORM with a native D1 driver; required as a forced dependency of better-auth's `drizzleAdapter`
- Why here: TBD
- Gotcha (from code): `src/lib/auth.ts` imports `drizzle-orm/d1` and `drizzleAdapter`; schema tables defined in `src/db/schema.ts`
- Source: https://orm.drizzle.team/docs/get-started/d1-new

## better-auth (vs Auth.js / NextAuth)
- What: Auth library with a Drizzle adapter and first-class offline-access/refresh-token support; avoids OIDC discovery fetches that time out on Workers cold starts
- Why here: TBD
- Gotcha (from code): `accessType: "offline"` and `prompt: "consent"` ensure a refresh token is issued; `auth.api.getAccessToken` transparently renews expired tokens
- Source: https://www.better-auth.com/docs

## Gmail OAuth refresh flow
- What: `accessType: "offline"` + `prompt: "consent"` ensures a refresh token is issued; `auth.api.getAccessToken` transparently renews expired tokens
- Why here: TBD
- Gotcha (from code): the original code did a raw `SELECT accessToken` — tokens silently expired after 1 hour, forcing re-sign-in. The fix lives in `src/lib/get-access-token.ts`
- Source: https://developers.google.com/identity/protocols/oauth2/web-server#offline

## Vite SPA + Hono Worker architecture
- What: Single Vite SPA entry served from a Hono Worker — no Next.js, no SSR, no OpenNext
- Why here: TBD
- Gotcha (from code): `src/worker.ts` handles `/api/*` routing and serves built assets via the `ASSETS` binding; the SPA routes client-side via `react-router-dom`
- Source: https://hono.dev/docs/getting-started/cloudflare-workers
