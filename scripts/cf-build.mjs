/**
 * Custom cf:build for email-manager in Fleet monorepo.
 *
 * opennext's esbuild step fails in the Fleet monorepo because node_modules/next
 * isn't in the .open-next/server-functions/default/ directory.
 *
 * Fix: After opennext copies files and creates index.mjs, inject the missing
 * node_modules/next symlink, then run the bundleServer step again (which succeeds
 * because now next can be resolved).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, symlinkSync, cpSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");
const serverFunctionsDefaultDir = join(projectDir, ".open-next/server-functions/default");
const nodeModulesDir = join(serverFunctionsDefaultDir, "node_modules");

function createSymlink(targetResolvePath, targetName, linkPath) {
  if (existsSync(linkPath)) return;
  try {
    const pkgPath = require.resolve(`${targetResolvePath}/package.json`, { paths: [projectDir] });
    const pkgDir = dirname(pkgPath);
    symlinkSync(pkgDir, linkPath);
    console.log(`  Created: ${targetName} -> ${pkgDir}`);
  } catch (e) {
    console.warn(`  Could not create symlink for ${targetName}: ${e.message}`);
  }
}

function ensureNodeModulesSymlinks() {
  if (!existsSync(serverFunctionsDefaultDir)) return;
  mkdirSync(nodeModulesDir, { recursive: true });

  // Packages that need to be resolvable from the server-functions/default/ dir
  const packages = [
    "next",
    "@libsql/client",
    "drizzle-orm",
    "better-auth",
  ];

  for (const pkg of packages) {
    const parts = pkg.split("/");
    const isScoped = pkg.startsWith("@");
    if (isScoped) {
      const scopeDir = join(nodeModulesDir, parts[0]);
      mkdirSync(scopeDir, { recursive: true });
      createSymlink(pkg, pkg, join(scopeDir, parts[1]));
    } else {
      createSymlink(pkg, pkg, join(nodeModulesDir, pkg));
    }
  }
}

// Step 1: Run the full opennext build
// It will fail at the esbuild step but that's OK — we need it to copy .next files
console.log("[cf-build] Running opennext build (may fail at esbuild step)...");
try {
  execSync("node_modules/.bin/opennextjs-cloudflare build", {
    cwd: projectDir,
    stdio: "inherit",
    env: { ...process.env, SKIP_ESBUILD_FAIL: "1" },
  });
  console.log("[cf-build] Build succeeded on first try!");
  process.exit(0);
} catch {
  console.log("[cf-build] First build attempt failed (expected). Injecting node_modules...");
}

// Step 2: Inject the missing node_modules symlinks
console.log("[cf-build] Creating missing node_modules symlinks in server-functions/default/...");
ensureNodeModulesSymlinks();

// Step 3: Re-run opennext with --skipNextBuild (faster, skips next build)
// The .open-next dir already has the copied files from step 1 (even though esbuild failed)
console.log("[cf-build] Re-running opennext bundle step...");
try {
  execSync("node_modules/.bin/opennextjs-cloudflare build --skipNextBuild", {
    cwd: projectDir,
    stdio: "inherit",
  });
  console.log("[cf-build] Build complete!");
} catch (e) {
  // The --skipNextBuild may fail if .next/standalone doesn't exist with the right structure
  // In that case, try running with next build first
  console.log("[cf-build] skipNextBuild failed, trying with next build...");

  // Ensure symlinks exist before the full build recreates .open-next
  // We'll use a postinstall-style trick: run next build separately, then opennext bundle only
  execSync("pnpm build", { cwd: projectDir, stdio: "inherit" });
  ensureNodeModulesSymlinks();

  execSync("node_modules/.bin/opennextjs-cloudflare build --skipNextBuild", {
    cwd: projectDir,
    stdio: "inherit",
  });
  console.log("[cf-build] Build complete!");
}
