#!/usr/bin/env node
// overlay-landing.mjs — after `vite build`, save the SPA shell as
// `dist/spa-index.html`, then overlay `landing-astro/dist/` so anon GET /
// serves Astro HTML while /app, /about, and /privacy are served from
// spa-index.html by the Hono worker.

import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DIST = resolve('dist');
const ASTRO_DIST = resolve('landing-astro/dist');
const SPA_INDEX = join(DIST, 'spa-index.html');
const PROTECTED_PREFIXES = ['spa-index.html', 'assets/'];

async function walk(dir, rel = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const fullSrc = join(dir, entry.name);
    const fullRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await walk(fullSrc, fullRel)));
    } else {
      out.push({ src: fullSrc, rel: fullRel });
    }
  }
  return out;
}

async function mergeHeaders(astroHeadersPath, targetHeadersPath) {
  const astroHeaders = existsSync(astroHeadersPath) ? await readFile(astroHeadersPath, 'utf8') : '';
  const targetHeaders = existsSync(targetHeadersPath)
    ? await readFile(targetHeadersPath, 'utf8')
    : '';
  if (!astroHeaders) return false;
  const merged = `# --- from landing-astro/dist/_headers ---\n${astroHeaders.trim()}\n\n# --- from Vite public/_headers ---\n${targetHeaders.trim()}\n`;
  await writeFile(targetHeadersPath, merged);
  return true;
}

async function main() {
  const viteIndex = join(DIST, 'index.html');
  if (!existsSync(viteIndex)) {
    console.error('[overlay-landing] dist/index.html missing — run vite build first');
    process.exit(1);
  }

  await copyFile(viteIndex, SPA_INDEX);
  console.log('[overlay-landing] saved dist/spa-index.html');

  if (!existsSync(ASTRO_DIST)) {
    console.error('[overlay-landing] landing-astro/dist missing — build landing-astro first');
    process.exit(1);
  }

  const files = await walk(ASTRO_DIST);
  let copied = 0;
  let skipped = 0;

  for (const { src, rel } of files) {
    if (PROTECTED_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(prefix))) {
      skipped += 1;
      continue;
    }
    if (rel === '_headers') {
      await mergeHeaders(src, join(DIST, '_headers'));
      console.log('[overlay-landing] merged _headers');
      continue;
    }
    const dest = join(DIST, rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    copied += 1;
  }

  console.log(
    `[overlay-landing] copied ${copied} file(s) from landing-astro/dist, skipped ${skipped} protected path(s)`
  );
}

main().catch((err) => {
  console.error('[overlay-landing] fatal:', err);
  process.exit(1);
});
