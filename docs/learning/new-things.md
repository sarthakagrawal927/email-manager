# New things to learn — email-manager

Semantic email search with in-browser ONNX inference, Cloudflare Workers edge deployment, and privacy-first local storage.

---

## HuggingFace Transformers.js (ONNX in-browser)
- What: Run ONNX models client-side via WebAssembly — no server inference required.
- Why here: TBD
- Gotcha (from code): Escaping the import requires four simultaneous tricks — `webpackIgnore` comment (`src/lib/embeddings.ts:12`), webpack alias to `false` for server builds (`next.config.ts:83-86`), `serverExternalPackages` (`next.config.ts:57`), AND an esbuild external in the OpenNext bundle step (`patches/opennext-cloudflare-externals.js:16`); omitting any one causes the onnxruntime-node native binary to be pulled into the Worker bundle.
- Source: https://huggingface.co/docs/transformers.js/index — See also `external-references.md`

## ONNX Runtime: SIMD, threading, and CSP
- What: WASM ONNX can be multi-threaded but requires `SharedArrayBuffer` + specific COOP/COEP headers; CSP `connect-src` must whitelist multiple HuggingFace CDN shards.
- Why here: TBD
- Gotcha (from code): A too-narrow CSP silently blocks the model fetch with an error that looks like an ONNX crash, not a network error. The live CSP whitelists four HuggingFace CDN shards (`next.config.ts:18`).
- Source: https://onnxruntime.ai/docs/get-started/with-javascript/web.html — See also `external-references.md`

## fp32 vs int8 model choice
- What: `dtype: "fp32"` gives reliable accuracy; quantized variants (int8, q4) are smaller/faster but had reported accuracy regressions in early Transformers.js v3.
- Why here: TBD
- Grounded: `src/lib/embeddings.ts:13` uses `{ dtype: "fp32" }` explicitly.
- Source: See `external-references.md`

## IndexedDB as primary store (privacy-by-design)
- What: Storing email bodies and embeddings exclusively in the browser means zero server-side mailbox data — no GDPR/CCPA storage obligations for email content.
- Why here: TBD
- Grounded: `src/lib/db.ts` opens DB `"email-search"` via the `idb` library; `StoredEmail` type includes `embedding: number[] | null` alongside the full body. D1 (`email-manager-auth`) holds only auth tables.
- Source: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API — See also `external-references.md`

## Cloudflare Workers + D1 metadata tier
- What: CF Workers edge runtime with co-located D1 SQL for auth tables; Smart Placement reduces D1 round-trip latency automatically.
- Why here: TBD
- Gotcha (from code): CF Pages lacks `caches.default` and `ctx.waitUntil` — a Pages deploy was attempted and reverted within the same day (confirmed in `docs/archive/decisions.md:91`). A residual `pages.dev` URL even survives in `src/lib/auth.ts:24` as the fallback baseURL.
- Source: https://developers.cloudflare.com/workers/ — See also `external-references.md`

## Drizzle ORM on D1
- What: Lightweight TypeScript ORM with a native D1 driver; required as a forced dependency of better-auth's `drizzleAdapter`.
- Why here: TBD
- Grounded: `src/lib/auth.ts:3-4` imports `drizzle-orm/d1` and `drizzleAdapter`; schema tables defined in `src/db/schema.ts`; migration at `migrations/0001_better_auth.sql`.
- Source: https://orm.drizzle.team/docs/get-started/d1-new — See also `external-references.md`

## OpenNext for Next.js on Cloudflare
- What: Adapts the Next.js build output to run on CF Workers; adds esbuild bundling, edge-cache hooks, and static-asset serving.
- Why here: TBD
- Gotcha (from code): Next.js emits `.next/node_modules/.pnpm/` as a sparse pnpm store (only traced files). OpenNext's esbuild step resolves `next-server.js` relative imports (e.g. `node-environment.js`) that pnpm omitted. `scripts/cf-build.mjs:25-55` fixes this by copying `dist/server`, `dist/shared`, `dist/lib`, and `dist/build` from the Fleet workspace's full pnpm store and patching `.nft.json` trace manifests. Undocumented upstream (`opennext.js.org/cloudflare` has no mention of this).
- Source: https://opennext.js.org/cloudflare

## better-auth (vs Auth.js / NextAuth)
- What: Auth library with a Drizzle adapter and first-class offline-access/refresh-token support; avoids OIDC discovery fetches that time out on CF Workers cold starts.
- Why here: TBD
- Gotcha (from code): The migration from NextAuth created a fresh schema (`migrations/0001_better_auth.sql:1` — "Created fresh — no data migration"); no legacy NextAuth table rows needed porting since the project had no production users at migration time. `accessType: "offline"` and `prompt: "consent"` live at `src/lib/auth.ts:45-46`.
- Source: https://www.better-auth.com/docs — See also `external-references.md`

## Gmail OAuth refresh flow
- What: `accessType: "offline"` + `prompt: "consent"` ensures a refresh token is issued; `auth.api.getAccessToken` transparently renews expired tokens rather than raw SQL lookups.
- Why here: TBD
- Gotcha (from code): The original code did a raw `SELECT accessToken` — tokens silently expired after 1 hour, forcing re-sign-in. The fix lives in `src/lib/get-access-token.ts` (calls `auth.api.getAccessToken`); the OAuth params are at `src/lib/auth.ts:45-46`.
- Source: https://developers.google.com/identity/protocols/oauth2/web-server#offline

## `encodeBody: "manual"` double-gzip bug
- What: Workers runtime's default `encodeBody: "automatic"` re-compresses a response that is already gzip-compressed, producing double-encoded bytes.
- Why here: TBD
- Gotcha (from code): `worker.mjs` manually streams the assets-binding body through `CompressionStream("gzip")` then sets `content-encoding: gzip`. Without `encodeBody: "manual"` (`worker.mjs:105`) the runtime gzips it again — browsers received double-compressed bytes silently, rendering the landing page as binary garbage with no console error.
- Source: https://developers.cloudflare.com/workers/runtime-apis/response/ (search "encodeBody") — source confirmed live

## Beasties critical CSS
- What: Inlines above-the-fold CSS into HTML to eliminate render-blocking stylesheets and improve LCP.
- Why here: TBD
- Gotcha (from code): Beasties must run before `--skipNextBuild`; the `cf:build` script in `package.json` sequences it as: `next build` → `inline-critical-css.mjs` → `opennextjs-cloudflare build --skipNextBuild`. Running it after `--skipNextBuild` means the modified HTML never reaches the OpenNext asset bundle; `open-next.config.ts` uses `staticAssetsIncrementalCache` which serves prerendered HTML verbatim from the assets binding.
- Source: https://github.com/danielroe/beasties

## Custom Worker edge-cache wrapper
- What: A hand-written `worker.mjs` wraps the OpenNext-generated worker to serve anonymous GET `/` directly from the CF Static Assets binding, bypassing the full Next.js/OpenNext stack for warm hits.
- Why here: TBD
- Gotcha (from code): The Workers Static Assets binding does not auto-compress — `worker.mjs:62-106` manually gzips via `CompressionStream` and adds `Vary: Accept-Encoding`. Authenticated requests (detected by `session_token` cookie) bypass the cache entirely (`worker.mjs:33-37`) so signed-in users always get live SSR.
- Source: https://developers.cloudflare.com/workers/runtime-apis/cache — See also `external-references.md`
