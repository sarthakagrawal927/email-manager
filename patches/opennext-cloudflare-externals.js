#!/usr/bin/env node
// Patches @opennextjs/cloudflare bundle-server.js to mark native-binary
// packages (onnxruntime-node, @huggingface/transformers, sharp) as esbuild
// externals so they are not bundled into the Cloudflare Worker.
import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const bundleServerPath = require.resolve(
  "@opennextjs/cloudflare/dist/cli/build/bundle-server.js"
);

let src = readFileSync(bundleServerPath, "utf8");
const OLD = `external: ["./middleware/handler.mjs"],`;
const NEW = `external: ["./middleware/handler.mjs", "onnxruntime-node", "@huggingface/transformers", "sharp"],`;

if (src.includes(NEW)) {
  console.log("patch already applied");
  process.exit(0);
}

if (!src.includes(OLD)) {
  console.error("patch target not found — @opennextjs/cloudflare may have updated");
  process.exit(1);
}

writeFileSync(bundleServerPath, src.replace(OLD, NEW));
console.log("patched @opennextjs/cloudflare bundle-server.js");
