import { describe, it, expect } from 'vitest';
import { buildSessionQueue, sessionKeyAction, SESSION_SIZE } from '../triage-session';
import type { Email } from '../gmail';
import type { TriageActionRecord } from '../triage-actions';

const NOW = Date.parse('2026-07-03T12:00:00Z');

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: '1',
    threadId: 't1',
    subject: 'Test',
    from: 'sender@example.com',
    to: 'me@example.com',
    date: '2026-07-01T00:00:00Z',
    snippet: '',
    body: '',
    labelIds: ['UNREAD'],
    unsubscribeLink: null,
    unsubscribePost: false,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<TriageActionRecord> = {}): TriageActionRecord {
  return {
    emailId: '1',
    emailSubject: 'Test',
    kind: 'defer',
    state: 'queued',
    at: NOW - 1000,
    ...overrides,
  };
}

describe('sessionKeyAction', () => {
  it('maps action keys', () => {
    expect(sessionKeyAction('d')).toBe('defer');
    expect(sessionKeyAction('f')).toBe('followup');
    expect(sessionKeyAction('s')).toBe('summarize');
  });

  it('maps navigation keys', () => {
    expect(sessionKeyAction('j')).toBe('next');
    expect(sessionKeyAction('ArrowDown')).toBe('next');
    expect(sessionKeyAction('ArrowRight')).toBe('next');
    expect(sessionKeyAction('k')).toBe('prev');
    expect(sessionKeyAction('ArrowUp')).toBe('prev');
    expect(sessionKeyAction('ArrowLeft')).toBe('prev');
    expect(sessionKeyAction('Escape')).toBe('exit');
  });

  it('returns null for unmapped keys', () => {
    expect(sessionKeyAction('x')).toBeNull();
    expect(sessionKeyAction('D')).toBeNull();
    expect(sessionKeyAction('Enter')).toBeNull();
  });
});

describe('buildSessionQueue', () => {
  it('includes only unread messages', () => {
    const emails = [
      makeEmail({ id: 'a', labelIds: ['UNREAD'] }),
      makeEmail({ id: 'b', labelIds: [] }),
    ];
    const ids = buildSessionQueue(emails, [], { now: NOW }).map((i) => i.email.id);
    expect(ids).toEqual(['a']);
  });

  it('excludes messages with an active triage record', () => {
    const emails = [makeEmail({ id: 'a' }), makeEmail({ id: 'b' })];
    const records = [
      makeRecord({ emailId: 'a', state: 'applied' }),
      makeRecord({ emailId: 'b', state: 'queued', snoozeUntil: NOW + 60_000 }),
    ];
    expect(buildSessionQueue(emails, records, { now: NOW })).toEqual([]);
  });

  it('includes messages whose snooze has expired', () => {
    const emails = [makeEmail({ id: 'a' })];
    const records = [makeRecord({ emailId: 'a', state: 'queued', snoozeUntil: NOW - 60_000 })];
    const ids = buildSessionQueue(emails, records, { now: NOW }).map((i) => i.email.id);
    expect(ids).toEqual(['a']);
  });

  it('caps the queue at the session size', () => {
    const emails = Array.from({ length: SESSION_SIZE + 10 }, (_, i) => makeEmail({ id: `e${i}` }));
    expect(buildSessionQueue(emails, [], { now: NOW })).toHaveLength(SESSION_SIZE);
    expect(buildSessionQueue(emails, [], { now: NOW, limit: 3 })).toHaveLength(3);
  });

  it('orders respond-queue items before quick-review items', () => {
    const emails = [
      makeEmail({ id: 'plain', subject: 'Monthly photo dump' }),
      makeEmail({ id: 'urgent', subject: 'Urgent: reply by tomorrow' }),
    ];
    const ids = buildSessionQueue(emails, [], { now: NOW }).map((i) => i.email.id);
    expect(ids).toEqual(['urgent', 'plain']);
  });
});
