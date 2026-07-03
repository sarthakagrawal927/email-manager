import { describe, it, expect } from 'vitest';
import {
  parseSenderAddress,
  buildGmailFilterSuggestions,
  buildGmailFilterXml,
  buildSelectedRecipeSummary,
} from '../filter-builder';
import type { Email } from '../gmail';

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: '1',
    threadId: 't1',
    subject: 'Test',
    from: 'sender@example.com',
    to: 'me@example.com',
    date: '2026-01-01T00:00:00Z',
    snippet: '',
    body: '',
    labelIds: [],
    unsubscribeLink: null,
    unsubscribePost: false,
    ...overrides,
  };
}

describe('parseSenderAddress', () => {
  it('extracts email from angle brackets', () => {
    const result = parseSenderAddress('John Doe <john@example.com>');
    expect(result.senderEmail).toBe('john@example.com');
    expect(result.domain).toBe('example.com');
    expect(result.displayName).toBe('John Doe');
  });

  it('handles bare email address', () => {
    const result = parseSenderAddress('jane@example.com');
    expect(result.senderEmail).toBe('jane@example.com');
    expect(result.displayName).toBe('jane@example.com');
  });

  it('falls back to unknown domain for malformed address', () => {
    const result = parseSenderAddress('no-email-here');
    expect(result.domain).toBe('unknown');
  });
});

describe('buildGmailFilterSuggestions', () => {
  it('groups newsletter emails by sender', () => {
    const emails: Email[] = [
      makeEmail({
        from: 'News <news@corp.com>',
        subject: 'Weekly newsletter',
        snippet: 'unsubscribe',
      }),
      makeEmail({
        from: 'News <news@corp.com>',
        subject: 'Another newsletter',
        snippet: 'view in browser',
      }),
    ];
    const suggestions = buildGmailFilterSuggestions(emails);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].category).toBe('newsletter');
    expect(suggestions[0].senderEmail).toBe('news@corp.com');
    expect(suggestions[0].matchCount).toBe(2);
  });

  it('returns empty for no matching emails', () => {
    const suggestions = buildGmailFilterSuggestions([makeEmail({ subject: 'Hello' })]);
    expect(suggestions).toHaveLength(0);
  });

  it('requires at least 2 emails for non-newsletter categories', () => {
    const emails: Email[] = [
      makeEmail({ from: 'shop@store.com', subject: 'Your receipt', snippet: 'payment confirmed' }),
    ];
    const suggestions = buildGmailFilterSuggestions(emails);
    expect(suggestions).toHaveLength(0);
  });
});

describe('buildGmailFilterXml', () => {
  it('produces valid XML feed', () => {
    const emails: Email[] = [
      makeEmail({ from: 'News <news@corp.com>', subject: 'newsletter', snippet: 'unsubscribe' }),
      makeEmail({ from: 'News <news@corp.com>', subject: 'digest', snippet: 'view in browser' }),
    ];
    const suggestions = buildGmailFilterSuggestions(emails);
    const xml = buildGmailFilterXml(suggestions);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<feed');
    expect(xml).toContain('<entry>');
    expect(xml).toContain('news@corp.com');
  });
});

describe('buildSelectedRecipeSummary', () => {
  it('returns message for empty selection', () => {
    expect(buildSelectedRecipeSummary([])).toBe('No recipes selected.');
  });

  it('summarizes selected recipes', () => {
    const emails: Email[] = [
      makeEmail({ from: 'News <news@corp.com>', subject: 'newsletter', snippet: 'unsubscribe' }),
      makeEmail({ from: 'News <news@corp.com>', subject: 'digest', snippet: 'view in browser' }),
    ];
    const suggestions = buildGmailFilterSuggestions(emails);
    const summary = buildSelectedRecipeSummary(suggestions);
    expect(summary).toContain('1 filter');
    expect(summary).toContain('Newsletters');
  });
});
