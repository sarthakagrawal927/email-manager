import { describe, expect, it } from 'vitest';

import type { Email } from '../gmail';
import { senderKey, uniqueSubscriptionSenders } from '../subscription-senders';

function email(overrides: Partial<Email> & Pick<Email, 'id' | 'from'>): Email {
  return {
    threadId: overrides.id,
    subject: 'Subject',
    to: 'me@example.com',
    date: '2026-07-04T12:00:00Z',
    snippet: 'snippet',
    body: '',
    labelIds: ['INBOX'],
    unsubscribeLink: null,
    unsubscribePost: false,
    ...overrides,
  };
}

describe('subscription senders', () => {
  it('extracts sender key from angle-bracket addresses', () => {
    expect(senderKey('News <news@corp.com>')).toBe('news@corp.com');
    expect(senderKey('news@corp.com')).toBe('news@corp.com');
  });

  it('deduplicates by sender and keeps only unsubscribe-capable mail', () => {
    const senders = uniqueSubscriptionSenders([
      email({
        id: '1',
        from: 'News <news@corp.com>',
        unsubscribeLink: 'https://corp.com/unsub',
      }),
      email({
        id: '2',
        from: 'News <news@corp.com>',
        subject: 'Older',
        unsubscribeLink: 'https://corp.com/unsub-old',
      }),
      email({ id: '3', from: 'Friend <friend@example.com>' }),
      email({
        id: '4',
        from: 'Deals <deals@shop.com>',
        unsubscribeLink: 'mailto:deals@shop.com',
      }),
    ]);

    expect(senders).toHaveLength(2);
    expect(senders.map((e) => e.id)).toEqual(['1', '4']);
  });
});
