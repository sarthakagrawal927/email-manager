import { describe, expect, it } from 'vitest';

import { classifyThreadReplyStatus, isFromUser, isUnsubscribeSentEmail } from '../sent-reply';

describe('sent reply status', () => {
  it('detects user addresses in From headers', () => {
    expect(isFromUser('Me <me@example.com>', 'me@example.com')).toBe(true);
    expect(isFromUser('them@example.com', 'me@example.com')).toBe(false);
  });

  it('marks threads awaiting when the latest message is from the user', () => {
    const status = classifyThreadReplyStatus(
      [
        { from: 'them@example.com', date: '2026-07-01T10:00:00Z' },
        { from: 'Me <me@example.com>', date: '2026-07-02T10:00:00Z' },
      ],
      'me@example.com'
    );
    expect(status).toBe('awaiting');
  });

  it('marks threads replied when someone else sent the latest message', () => {
    const status = classifyThreadReplyStatus(
      [
        { from: 'Me <me@example.com>', date: '2026-07-01T10:00:00Z' },
        { from: 'them@example.com', date: '2026-07-02T10:00:00Z' },
      ],
      'me@example.com'
    );
    expect(status).toBe('replied');
  });
});

describe('isUnsubscribeSentEmail', () => {
  it('detects unsubscribe subjects and recipients', () => {
    expect(
      isUnsubscribeSentEmail({
        subject: 'Unsubscribe',
        to: 'news@company.com',
        snippet: '',
      })
    ).toBe(true);
    expect(
      isUnsubscribeSentEmail({
        subject: 'Re: Weekly digest',
        to: 'unsubscribe@lists.company.com',
        snippet: '',
      })
    ).toBe(true);
    expect(
      isUnsubscribeSentEmail({
        subject: '(no subject)',
        to: 'news@company.com',
        snippet: 'Please unsubscribe me from this list.',
      })
    ).toBe(true);
  });

  it('keeps normal sent conversations', () => {
    expect(
      isUnsubscribeSentEmail({
        subject: 'Re: Project update',
        to: 'colleague@company.com',
        snippet: 'Thanks for the update.',
      })
    ).toBe(false);
  });
});
