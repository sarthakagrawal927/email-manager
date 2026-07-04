#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const devVarsPath = resolve(root, '.dev.vars');
const examplePath = resolve(root, '.env.example');

const REQUIRED_KEYS = [
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'BETTER_AUTH_URL',
];

function parseEnvFile(contents) {
  const values = new Map();
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    values.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
  }
  return values;
}

function serializeEnvFile(values) {
  const lines = [
    '# Local wrangler dev secrets. Generated/updated by pnpm setup:dev.',
    '# Add Google OAuth credentials from Google Cloud Console to sign in locally.',
    '',
    'NODE_ENV=development',
    `BETTER_AUTH_URL=${values.get('BETTER_AUTH_URL') ?? 'http://localhost:8787'}`,
    `BETTER_AUTH_SECRET=${values.get('BETTER_AUTH_SECRET') ?? randomBytes(32).toString('base64')}`,
    `GOOGLE_CLIENT_ID=${values.get('GOOGLE_CLIENT_ID') ?? ''}`,
    `GOOGLE_CLIENT_SECRET=${values.get('GOOGLE_CLIENT_SECRET') ?? ''}`,
    '',
  ];
  return `${lines.join('\n')}`;
}

function main() {
  const seed = existsSync(devVarsPath)
    ? parseEnvFile(readFileSync(devVarsPath, 'utf8'))
    : existsSync(examplePath)
      ? parseEnvFile(readFileSync(examplePath, 'utf8'))
      : new Map();

  if (!seed.get('BETTER_AUTH_SECRET')) {
    seed.set('BETTER_AUTH_SECRET', randomBytes(32).toString('base64'));
  }
  seed.set('BETTER_AUTH_URL', 'http://localhost:8787');
  seed.set('NODE_ENV', 'development');

  writeFileSync(devVarsPath, serializeEnvFile(seed), 'utf8');

  const missing = REQUIRED_KEYS.filter((key) => {
    if (key === 'BETTER_AUTH_URL' || key === 'BETTER_AUTH_SECRET') return false;
    return !seed.get(key);
  });

  console.log(`[setup-dev] wrote ${devVarsPath}`);
  if (missing.length > 0) {
    console.log(
      `[setup-dev] still missing: ${missing.join(', ')} — copy values from Google Cloud Console into .dev.vars`
    );
    console.log(
      '[setup-dev] register OAuth redirect: http://localhost:8787/api/auth/callback/google'
    );
    process.exitCode = 1;
    return;
  }

  console.log('[setup-dev] local auth is ready. Run: pnpm dev');
}

main();
