import { describe, expect, it } from 'vitest';

import { formatSyncAge, isInboxStale, INBOX_STALE_MS } from '../sync-age';

describe('sync age', () => {
  const now = Date.parse('2026-07-04T12:00:00Z');

  it('marks missing sync time as stale', () => {
    expect(isInboxStale(null, now)).toBe(true);
    expect(formatSyncAge(null, now)).toBe('never synced');
  });

  it('detects stale cache after threshold', () => {
    const old = new Date(now - INBOX_STALE_MS - 1).toISOString();
    expect(isInboxStale(old, now)).toBe(true);
    expect(formatSyncAge(old, now)).toBe('1 hr ago');
  });

  it('treats recent sync as fresh', () => {
    const recent = new Date(now - 5 * 60_000).toISOString();
    expect(isInboxStale(recent, now)).toBe(false);
    expect(formatSyncAge(recent, now)).toBe('5 min ago');
  });
});
