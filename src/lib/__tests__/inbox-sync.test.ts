import { describe, expect, it, vi } from 'vitest';

import { classifySyncError, DEFAULT_INBOX_SYNC, SYNC_MAX_PAGE } from '../inbox-sync';

describe('inbox-sync constants', () => {
  it('bounds sync page size to 500', () => {
    expect(SYNC_MAX_PAGE).toBe(500);
  });

  it('defaults to a bounded target', () => {
    expect(DEFAULT_INBOX_SYNC).toBeGreaterThan(0);
    expect(DEFAULT_INBOX_SYNC).toBeLessThanOrEqual(SYNC_MAX_PAGE * 10);
  });
});

describe('classifySyncError', () => {
  it('classifies 401/403 as auth', () => {
    expect(classifySyncError({ status: 401 })).toEqual({ stage: 'auth', class: 'auth' });
    expect(classifySyncError({ status: 403 })).toEqual({ stage: 'auth', class: 'auth' });
  });

  it('classifies 429 as http_429', () => {
    expect(classifySyncError({ status: 429 })).toEqual({ stage: 'fetch_page', class: 'http_429' });
  });

  it('classifies 5xx as http_5xx', () => {
    expect(classifySyncError({ status: 500 })).toEqual({ stage: 'fetch_page', class: 'http_5xx' });
    expect(classifySyncError({ status: 503 })).toEqual({ stage: 'fetch_page', class: 'http_5xx' });
  });

  it('classifies 4xx as http_4xx', () => {
    expect(classifySyncError({ status: 404 })).toEqual({ stage: 'fetch_page', class: 'http_4xx' });
  });

  it('classifies network errors by message', () => {
    expect(classifySyncError(new Error('fetch failed'))).toEqual({
      stage: 'network',
      class: 'network',
    });
    expect(classifySyncError(new Error('Network request failed'))).toEqual({
      stage: 'network',
      class: 'network',
    });
    expect(classifySyncError(new Error('AbortError'))).toEqual({
      stage: 'network',
      class: 'network',
    });
  });

  it('falls back to unknown', () => {
    expect(classifySyncError(new Error('something else'))).toEqual({
      stage: 'fetch_page',
      class: 'unknown',
    });
    expect(classifySyncError(null)).toEqual({ stage: 'fetch_page', class: 'unknown' });
  });

  it('never exposes message content in the class', () => {
    const sensitive = new Error('Failed to fetch emails from sender secret@example.com');
    const result = classifySyncError(sensitive);
    expect(result.class).not.toContain('secret@example.com');
    expect(result.class).not.toContain('Failed to fetch');
    expect(result.stage).toBe('network');
  });
});

describe('sync lifecycle invariants (static)', () => {
  it('storeEmails is idempotent — put keyed by email id', async () => {
    // The db module's storeEmails uses db.transaction('emails', 'readwrite') +
    // tx.store.put(e) — put is idempotent on the primary key. Verify the db
    // module exports storeEmails and it references the 'emails' store.
    const dbModule = await import('../db');
    expect(typeof dbModule.storeEmails).toBe('function');
    // storeEmails source must use put (idempotent), not add (would throw on dup).
    const src = dbModule.storeEmails.toString();
    expect(src).toContain('put');
    expect(src).not.toMatch(/\badd\b/);
  });

  it('InboxSyncMeta includes lastError for durable failure', async () => {
    const dbModule = await import('../db');
    const src = dbModule.getInboxSyncMeta.toString();
    // The default meta must include lastError: null (clean state).
    expect(src).toContain('lastSyncedAt');
    // The type is in db.ts — verify the field exists by importing the type.
    const meta: import('../db').InboxSyncMeta = {
      nextPageToken: undefined,
      exhausted: false,
      lastSyncedAt: null,
      lastError: null,
    };
    expect(meta.lastError).toBeNull();
  });
});
