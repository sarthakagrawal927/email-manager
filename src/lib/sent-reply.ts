import type { Email } from './gmail';

export type SentReplyStatus = 'awaiting' | 'replied';

export function parseEmailAddress(header: string): string {
  const match = header.match(/<([^>]+)>/);
  return (match?.[1] ?? header).toLowerCase().trim();
}

export function isFromUser(fromHeader: string, userEmail: string): boolean {
  const user = userEmail.toLowerCase().trim();
  if (!user) return false;
  return parseEmailAddress(fromHeader) === user;
}

/**
 * If the latest message in a thread is from the user, the conversation is
 * awaiting a reply. Otherwise someone else replied after the user's send.
 */
export function classifyThreadReplyStatus(
  messages: Pick<Email, 'from' | 'date'>[],
  userEmail: string
): SentReplyStatus {
  if (messages.length === 0) return 'awaiting';

  const sorted = [...messages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const last = sorted[sorted.length - 1];
  return isFromUser(last.from, userEmail) ? 'awaiting' : 'replied';
}
