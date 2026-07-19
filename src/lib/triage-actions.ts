'use client';

type TriageActionKind = 'summarize' | 'defer' | 'reply' | 'followup' | 'skip';
type TriageActionState = 'queued' | 'applied' | 'skipped' | 'failed';

export interface TriageActionRecord {
  emailId: string;
  emailSubject: string;
  kind: TriageActionKind;
  state: TriageActionState;
  at: number;
  message?: string;
  snoozeUntil?: number;
}

function isActiveQueue(record: TriageActionRecord, now = Date.now()): boolean {
  if (record.state !== 'queued') return false;
  if (!record.snoozeUntil) return true;
  return record.snoozeUntil > now;
}

/**
 * Reduce all action records to the latest still-active state per email.
 * "applied", "skipped", or "queued (not yet due)" hides the item from the
 * working queue; expired snoozes drop back to pending.
 */
export function buildActiveMap(
  records: TriageActionRecord[],
  now = Date.now()
): Map<string, TriageActionRecord> {
  const map = new Map<string, TriageActionRecord>();
  for (const r of records) {
    if (r.state === 'queued' && !isActiveQueue(r, now)) continue;
    const existing = map.get(r.emailId);
    if (!existing || r.at >= existing.at) map.set(r.emailId, r);
  }
  return map;
}
