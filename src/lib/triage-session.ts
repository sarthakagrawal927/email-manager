import type { Email } from './gmail';
import { triageEmails, type TriageItem } from './triage';
import { buildActiveMap, type TriageActionRecord } from './triage-actions';

/** Max messages loaded into one keyboard triage session. */
export const SESSION_SIZE = 25;

export type SessionKeyAction =
  | 'defer'
  | 'followup'
  | 'summarize'
  | 'next'
  | 'prev'
  | 'exit'
  | 'help';

/**
 * Map a keydown `event.key` to a triage-session action.
 * `d` defer · `f` follow-up · `s` summarize · `j`/`k` + arrows next/prev ·
 * `Esc` exit · `?` help. Returns null for unmapped keys so callers can let
 * them through.
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
    case '?':
      return 'help';
    default:
      return null;
  }
}

/**
 * Returns true when the keydown target is a text-input element that should
 * swallow printable keys. Shared by TriageQueues and TriageSession so
 * keyboard shortcuts never interfere with typing. Uses duck typing (not
 * `instanceof HTMLElement`) so it is safe to call from non-DOM environments
 * (unit tests run under Node).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: unknown; isContentEditable?: boolean };
  if (typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
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
