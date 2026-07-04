#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const landingIndex = resolve('landing-astro/dist/index.html');

if (existsSync(landingIndex)) {
  console.log('[ensure-landing] landing page already built');
  process.exit(0);
}

console.log('[ensure-landing] building Astro landing page...');
execSync('pnpm --filter ./landing-astro build', { stdio: 'inherit' });
