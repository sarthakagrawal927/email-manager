import { describe, expect, it } from 'vitest';

import { classifyThreadReplyStatus, isFromUser } from '../sent-reply';

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
