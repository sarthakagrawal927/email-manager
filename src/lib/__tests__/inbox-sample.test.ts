import { describe, expect, it } from 'vitest';

import { appendSamplePage, emptyInboxSample, hasEnoughSample, sliceSample } from '../inbox-sample';
import type { Email } from '../gmail';

function email(id: string): Email {
  return {
    id,
    threadId: id,
    subject: `Subject ${id}`,
    from: 'sender@example.com',
    to: 'me@example.com',
    date: '2026-07-04T12:00:00Z',
    snippet: 'snippet',
    labelIds: ['INBOX'],
    unsubscribeLink: null,
    unsubscribePost: false,
    body: '',
  };
}

describe('inbox sample cache', () => {
  it('detects when cache satisfies a smaller target', () => {
    const state = { ...emptyInboxSample(), emails: [email('1'), email('2'), email('3')] };
    expect(hasEnoughSample(state, 2)).toBe(true);
    expect(sliceSample(state, 2)).toHaveLength(2);
  });

  it('appends pages and tracks pagination', () => {
    let state = emptyInboxSample();
    state = appendSamplePage(state, [email('1')], 'page-2');
    expect(state.emails).toHaveLength(1);
    expect(state.nextPageToken).toBe('page-2');
    expect(state.exhausted).toBe(false);

    state = appendSamplePage(state, [email('2')], undefined);
    expect(state.emails).toHaveLength(2);
    expect(state.exhausted).toBe(true);
  });
});
