import type { Email } from './gmail';
import { triageEmails, type TriageItem } from './triage';
import { buildActiveMap, type TriageActionRecord } from './triage-actions';

/** Max messages loaded into one keyboard triage session. */
export const SESSION_SIZE = 25;

export type SessionKeyAction = 'defer' | 'followup' | 'summarize' | 'next' | 'prev' | 'exit';

/**
 * Map a keydown `event.key` to a triage-session action.
 * `d` defer · `f` follow-up · `s` summarize · `j`/`k` + arrows next/prev ·
 * `Esc` exit. Returns null for unmapped keys so callers can let them through.
 */
export function sessionKeyAction(key: string): SessionKeyAction | null {
  switch (key) {
    case 'd':
      return 'defer';
    case 'f':
      return 'followup';
    case 's':
      return 'summarize';
    case 'j':
    case 'ArrowDown':
    case 'ArrowRight':
      return 'next';
    case 'k':
    case 'ArrowUp':
    case 'ArrowLeft':
      return 'prev';
    case 'Escape':
      return 'exit';
    default:
      return null;
  }
}

/**
 * Build the ordered work list for a keyboard triage session: unread messages
 * with no active triage state (untouched, or with an expired snooze), in
 * triage-queue order (respond → review → unsubscribe → reference, highest
 * score first), capped at `limit`.
 */
export function buildSessionQueue(
  emails: Email[],
  records: TriageActionRecord[],
  opts?: { limit?: number; now?: number }
): TriageItem[] {
  const limit = opts?.limit ?? SESSION_SIZE;
  const active = buildActiveMap(records, opts?.now ?? Date.now());
  return triageEmails(emails)
    .flatMap((queue) => queue.items)
    .filter((item) => item.email.labelIds.includes('UNREAD') && !active.has(item.email.id))
    .slice(0, limit);
}
