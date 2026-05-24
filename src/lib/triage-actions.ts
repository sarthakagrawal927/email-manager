"use client";

export type TriageActionKind = "summarize" | "defer" | "reply" | "followup" | "skip";
export type TriageActionState = "queued" | "applied" | "skipped" | "failed";

export interface TriageActionRecord {
  emailId: string;
  emailSubject: string;
  kind: TriageActionKind;
  state: TriageActionState;
  at: number;
  message?: string;
  snoozeUntil?: number;
}

const STORAGE_KEY = "email-manager:triage-actions:v1";
const MAX_RECORDS = 200;

export function loadRecords(): TriageActionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: TriageActionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = records.slice(-MAX_RECORDS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full or disabled — non-fatal.
  }
}

export function actionLabel(kind: TriageActionKind): string {
  switch (kind) {
    case "summarize": return "Summarize";
    case "defer": return "Defer";
    case "reply": return "Reply";
    case "followup": return "Follow up";
    case "skip": return "Skip";
  }
}

export function stateLabel(state: TriageActionState): string {
  switch (state) {
    case "queued": return "Queued";
    case "applied": return "Applied";
    case "skipped": return "Skipped";
    case "failed": return "Failed";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFER_MS = DAY_MS;
export const FOLLOWUP_MS = 3 * DAY_MS;

export function isActiveQueue(record: TriageActionRecord, now = Date.now()): boolean {
  if (record.state !== "queued") return false;
  if (!record.snoozeUntil) return true;
  return record.snoozeUntil > now;
}

/**
 * Reduce all action records to the latest still-active state per email.
 * "applied", "skipped", or "queued (not yet due)" hides the item from the
 * working queue; expired snoozes drop back to pending.
 */
export function buildActiveMap(records: TriageActionRecord[], now = Date.now()): Map<string, TriageActionRecord> {
  const map = new Map<string, TriageActionRecord>();
  for (const r of records) {
    if (r.state === "queued" && !isActiveQueue(r, now)) continue;
    const existing = map.get(r.emailId);
    if (!existing || r.at >= existing.at) map.set(r.emailId, r);
  }
  return map;
}

export function countByState(records: TriageActionRecord[], now = Date.now()) {
  const active = Array.from(buildActiveMap(records, now).values());
  return {
    queued: active.filter((r) => r.state === "queued").length,
    applied: active.filter((r) => r.state === "applied").length,
    skipped: active.filter((r) => r.state === "skipped").length,
    failed: active.filter((r) => r.state === "failed").length,
  };
}
