/**
 * Custom cf:build for email-manager in Fleet monorepo.
 *
 * Root cause: Next.js creates .next/node_modules/.pnpm/ with a sparse pnpm
 * store (only traced files). The standalone symlinks point into this sparse
 * store. When opennext's esbuild bundles the worker, it can't resolve
 * next-server.js's relative imports (node-environment.js etc.) because those
 * files aren't in the .next pnpm store.
 *
 * Fix:
 * 1. Run full opennext build (builds .next, fails at esbuild)
 * 2. Copy full next dist from Fleet workspace into .next/node_modules pnpm store
 * 3. Patch .nft.json files to include the missing next server files
 * 4. Re-run --skipNextBuild (reads patched .nft.json → full next in .open-next → esbuild succeeds)
 */
import { execSync } from "node:child_process";
import { readdirSync, existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");
const fleetRoot = resolve(projectDir, "..");

function patchDotNextPnpmStore() {
  const dotNextPnpm = join(projectDir, ".next/node_modules/.pnpm");
  if (!existsSync(dotNextPnpm)) {
    console.log("  .next/node_modules/.pnpm not found");
    return false;
  }

  const entries = readdirSync(dotNextPnpm);
  for (const entry of entries) {
    if (!entry.startsWith("next@")) continue;
    const dotNextNextDir = join(dotNextPnpm, entry, "node_modules/next");
    const fleetNextDir = join(fleetRoot, "node_modules/.pnpm", entry, "node_modules/next");

    if (!existsSync(fleetNextDir)) {
      console.warn(`  Fleet next not found for: ${entry.slice(0, 50)}`);
      continue;
    }

    console.log(`  Copying full next dist from Fleet workspace...`);
    for (const subdir of ["dist/server", "dist/shared", "dist/lib", "dist/build"]) {
      const src = join(fleetNextDir, subdir);
      const dst = join(dotNextNextDir, subdir);
      if (existsSync(src)) {
        mkdirSync(dst, { recursive: true });
        cpSync(src, dst, { recursive: true, force: true });
        console.log(`    Patched: ${subdir}`);
      }
    }
    return true;
  }
  return false;
}

function patchNftFiles() {
  const dotNext = join(projectDir, ".next");
  const sampleNft = join(dotNext, "server/app/page.js.nft.json");
  if (!existsSync(sampleNft)) return;

  const sample = JSON.parse(readFileSync(sampleNft, "utf8"));
  const nextEntry = sample.files.find(f => f.includes("node_modules/next") && !f.includes("pnpm"));
  if (!nextEntry) { console.warn("  Could not find next entry in nft.json"); return; }

  const MISSING_FILES = [
    "dist/server/node-environment.js", "dist/server/node-environment-baseline.js",
    "dist/server/node-polyfill-crypto.js", "dist/server/request-meta.js",
    "dist/server/base-server.js", "dist/server/require.js", "dist/server/send-payload.js",
    "dist/server/load-components.js", "dist/server/web/utils.js", "dist/server/base-http/node.js",
    "dist/shared/lib/utils.js", "dist/shared/lib/constants.js",
    "dist/shared/lib/router/utils/route-matcher.js",
    "dist/shared/lib/router/utils/middleware-route-matcher.js",
    "dist/shared/lib/router/utils/parse-url.js",
    "dist/shared/lib/page-path/denormalize-page-path.js",
    "dist/shared/lib/page-path/normalize-page-path.js",
    "dist/lib/find-pages-dir.js", "dist/lib/is-error.js", "dist/build/output/log.js",
  ];

  const nftFiles = [];
  function walkForNft(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) walkForNft(fullPath);
      else if (entry.name.endsWith(".nft.json")) nftFiles.push(fullPath);
    }
  }
  walkForNft(join(dotNext, "server"));

  let patched = 0;
  for (const nftPath of nftFiles) {
    try {
      const d = JSON.parse(readFileSync(nftPath, "utf8"));
      const existing = new Set(d.files);
      const prefix = d.files.find(f => f.includes("node_modules/next") && !f.includes("pnpm")) || nextEntry;
      let added = 0;
      for (const mf of MISSING_FILES) {
        const p = `${prefix}/${mf}`;
        if (!existing.has(p)) { d.files.push(p); added++; }
      }
      if (added > 0) { writeFileSync(nftPath, JSON.stringify(d)); patched++; }
    } catch { /* skip */ }
  }
  console.log(`  Patched ${patched}/${nftFiles.length} .nft.json files`);
}

console.log("[cf-build] Step 1: Running full opennext build (will fail at esbuild)...");
try {
  execSync("node_modules/.bin/opennextjs-cloudflare build", {
    cwd: projectDir,
    stdio: "inherit",
  });
  console.log("[cf-build] Build succeeded on first try!");
  process.exit(0);
} catch {
  console.log("[cf-build] First build failed at esbuild (expected). Running patches...");
}

console.log("[cf-build] Step 2: Patching .next pnpm store with full next dist...");
const patched = patchDotNextPnpmStore();
if (!patched) { console.error("[cf-build] Patch failed"); process.exit(1); }

console.log("[cf-build] Step 3: Patching .nft.json trace files...");
patchNftFiles();

console.log("[cf-build] Step 4: Re-running bundle step (--skipNextBuild)...");
execSync("node_modules/.bin/opennextjs-cloudflare build --skipNextBuild", {
  cwd: projectDir,
  stdio: "inherit",
});
console.log("[cf-build] Build complete!");
