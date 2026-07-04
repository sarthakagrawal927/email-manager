import type { Email } from '@/lib/gmail';

export interface InboxSampleState {
  emails: Email[];
  nextPageToken?: string;
  exhausted: boolean;
}

export function emptyInboxSample(): InboxSampleState {
  return { emails: [], nextPageToken: undefined, exhausted: false };
}

export function hasEnoughSample(state: InboxSampleState, target: number): boolean {
  return state.emails.length >= target;
}

export function sliceSample(state: InboxSampleState, target: number): Email[] {
  return state.emails.slice(0, target);
}

/** Merge a fetched page into the sample cache. */
export function appendSamplePage(
  state: InboxSampleState,
  batch: Email[],
  nextPageToken?: string
): InboxSampleState {
  const emails = state.emails.concat(batch);
  const exhausted = batch.length === 0 || !nextPageToken;
  return {
    emails,
    nextPageToken: exhausted ? undefined : nextPageToken,
    exhausted,
  };
}
