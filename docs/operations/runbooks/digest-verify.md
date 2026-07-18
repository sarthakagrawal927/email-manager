# Runbook: Digest Fixture Verification

Verify the weekly digest builder produces deterministic output against golden
fixtures.

## When to run

- After modifying `src/lib/digest.ts`.
- After changing the `WeeklyDigest` type shape.
- In CI (not currently wired, but safe to run locally anytime).

## Steps

1. **Run the verification script:**

   ```bash
   pnpm digest:verify
   # or: pnpm dlx tsx scripts/verify-digest-fixture.mjs
   ```

2. **Check the output:**

   The script compares `buildWeeklyDigest(fixtureEmails)` against
   `fixtures/weekly-digest-sample.json`. If it passes, the builder is
   deterministic against the fixture.

3. **If the fixture needs updating (intentional change to digest output):**

   - Edit `src/lib/digest.ts` with the intended change.
   - Run `pnpm dlx tsx -e "import { buildWeeklyDigest } from './src/lib/digest.ts'; import { readFileSync } from 'fs'; const emails = JSON.parse(readFileSync('fixtures/digest-sample-emails.json', 'utf8')); console.log(JSON.stringify(buildWeeklyDigest(emails), null, 2))" > fixtures/weekly-digest-sample.json`
   - Verify the diff is intentional.
   - Re-run `pnpm digest:verify` to confirm it passes.

## Files

- `scripts/verify-digest-fixture.mjs` — the verification script.
- `fixtures/digest-sample-emails.json` — synthetic `Email`-shaped input rows.
- `fixtures/weekly-digest-sample.json` — golden expected digest output.
- `src/lib/digest.ts` — the pure builder (`buildWeeklyDigest`).

## What this does NOT verify

- UI rendering (`WeeklyDigestView.tsx`).
- IndexedDB integration (the builder is pure; it takes emails as input).
- Real Gmail data (fixtures are synthetic).
