import type { Email } from './gmail';

export type SentReplyStatus = 'awaiting' | 'replied';

const UNSUBSCRIBE_TEXT =
  /\b(unsubscribe|unsub(?:scribe)?|opt[- ]?out|remove(?:\s+me)?|stop\s+(?:mailing|sending|emails?))\b/i;

const UNSUBSCRIBE_RECIPIENT =
  /(?:^|[/@])(?:unsubscribe|list-unsubscribe|optout|opt-out|leave-list|leave|unsub)(?:@|[./]|$)/i;

/** Mailto / list-unsubscribe requests the user sent — not real conversations. */
export function isUnsubscribeSentEmail(email: Pick<Email, 'subject' | 'to' | 'snippet'>): boolean {
  const subject = email.subject.trim();
  const to = email.to.toLowerCase();
  const snippet = email.snippet.trim();

  if (UNSUBSCRIBE_TEXT.test(subject) || UNSUBSCRIBE_TEXT.test(snippet)) {
    return true;
  }
  if (UNSUBSCRIBE_RECIPIENT.test(to)) {
    return true;
  }
  if ((subject === '(no subject)' || subject === '') && /\bunsubscribe\b/i.test(snippet)) {
    return true;
  }
  return false;
}

function parseEmailAddress(header: string): string {
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
