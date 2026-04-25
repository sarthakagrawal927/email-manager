/**
 * Pre-bundle patch: stub out @huggingface/transformers dynamic imports
 * in the Next.js compiled server output before opennext's esbuild processes it.
 * This prevents esbuild from following into onnxruntime-node native binaries.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Patch both the regular and standalone server outputs
const DIRS_TO_PATCH = [
  ".next/server",
  ".next/standalone/.next/server",
];

function patchFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  if (!content.includes("onnxruntime") && !content.includes("@huggingface/transformers")) return;

  const original = content;

  // Stub dynamic import of @huggingface/transformers (esbuild follows these)
  content = content.replace(
    /import\(["']@huggingface\/transformers["']\)/g,
    "Promise.resolve({})"
  );

  // Stub static require of onnxruntime-node
  content = content.replace(
    /require\(["']onnxruntime-node["']\)/g,
    "({})"
  );

  // Stub dynamic require template literals for onnxruntime bindings
  content = content.replace(
    /require\(`[^`]*onnxruntime[^`]*`\)/g,
    "({})"
  );

  if (content !== original) {
    writeFileSync(filePath, content);
    console.log(`Patched: ${filePath}`);
  }
}

function walkDir(dir) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.endsWith(".js") || entry.endsWith(".mjs") || entry.endsWith(".cjs")) {
        patchFile(fullPath);
      }
    }
  } catch {
    // Directory may not exist
  }
}

console.log("Patching Next.js server output for CF Workers compatibility...");
for (const dir of DIRS_TO_PATCH) {
  walkDir(dir);
}
console.log("Patch complete.");
