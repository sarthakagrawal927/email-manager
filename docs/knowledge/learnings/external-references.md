# External References — email-manager

One-line entries per topic. Canonical external sources only — no re-explanation of
concepts that these sources already cover well.

---

## In-browser ML / Transformers.js

- **Transformers.js docs** — [huggingface.co/docs/transformers.js](https://huggingface.co/docs/transformers.js/index)
  The authoritative guide to running ONNX models in the browser; covers pipeline API, dtype options, and CDN model loading. Relevant to `src/lib/embeddings.ts`.

- **ONNX Runtime Web** — [onnxruntime.ai/docs/get-started/with-javascript/web.html](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
  Explains WASM backend, SIMD support, threading prerequisites (`SharedArrayBuffer`), and performance tuning. Relevant to lessons 2–4 in `docs/lessons.md`.

- **all-MiniLM-L6-v2 model card** — [huggingface.co/sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
  Benchmark numbers, training corpus, and embedding dimension (384) for the model used in `src/lib/embeddings.ts`. Relevant to ADR-002 in `docs/decisions.md`.

---

## IndexedDB

- **MDN IndexedDB API** — [developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  Schema versioning, object store migrations, index creation — the `upgrade` callback pattern used in `src/lib/db.ts`.

- **Browser storage limits (MDN)** — [developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
  Explains per-origin quotas (~60% of available disk), eviction policy (LRU under storage pressure). Relevant to lessons 7–8 in `docs/lessons.md`.

- **`idb` library** — [github.com/jakearchibald/idb](https://github.com/jakearchibald/idb)
  Thin Promise wrapper around the IndexedDB API used in `src/lib/db.ts`. Source for `openDB`, transaction helpers.

---

## Cloudflare Workers + Next.js

- **OpenNext Cloudflare adapter** — [opennext.js.org/cloudflare](https://opennext.js.org/cloudflare)
  Official docs for `@opennextjs/cloudflare`; covers `defineCloudflareConfig`, incremental cache overrides, and the `--skipNextBuild` flag. Central to ADR-007 and lessons 9, 14–16.

- **CF Workers bundle size limits** — [developers.cloudflare.com/workers/platform/limits](https://developers.cloudflare.com/workers/platform/limits)
  1 MB compressed bundle limit, CPU time limits, startup time. Relevant to ADR-004 and lesson 9.

- **CF Workers `caches.default`** — [developers.cloudflare.com/workers/runtime-apis/cache](https://developers.cloudflare.com/workers/runtime-apis/cache)
  Cache API semantics used in `worker.mjs`; per-PoP scope, `cache.put`/`cache.match` patterns. Relevant to lesson 12.

- **CF D1** — [developers.cloudflare.com/d1](https://developers.cloudflare.com/d1)
  SQLite-compatible serverless DB, row limits, migration support. D1 is auth-only in this project (`email-manager-auth`).

- **CF Workers Smart Placement** — [developers.cloudflare.com/workers/configuration/smart-placement](https://developers.cloudflare.com/workers/configuration/smart-placement)
  How Smart Placement selects Worker region based on D1 proximity. Relevant to ADR-004 and lesson 11.

---

## Drizzle ORM

- **Drizzle ORM docs** — [orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
  Schema definition, migration CLI, D1 adapter. Relevant to ADR-006 and `src/db/schema.ts`.

- **Drizzle D1 adapter** — [orm.drizzle.team/docs/get-started/d1-new](https://orm.drizzle.team/docs/get-started/d1-new)
  Specific guide for `drizzle-orm/d1` with Cloudflare Workers bindings.

---

## Auth

- **better-auth docs** — [better-auth.com/docs](https://www.better-auth.com/docs)
  Session management, Drizzle adapter, social provider config (`accessType`, `prompt`). Relevant to ADR-005.

- **RFC 8058 — One-Click Unsubscribe** — [datatracker.ietf.org/doc/html/rfc8058](https://datatracker.ietf.org/doc/html/rfc8058)
  Defines the `List-Unsubscribe-Post` header and one-click POST mechanism parsed in `src/lib/gmail.ts`.
