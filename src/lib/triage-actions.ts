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
    case "skip": return "Ignore";
  }
}

// User-facing state label. "skipped" surfaces as "Ignored" to match the
// queued / applied / failed / ignored vocabulary used across the product.
export function stateLabel(state: TriageActionState): string {
  switch (state) {
    case "queued": return "Queued";
    case "applied": return "Applied";
    case "skipped": return "Ignored";
    case "failed": return "Failed";
  }
}

export function stateClass(state: TriageActionState): string {
  switch (state) {
    case "applied": return "text-emerald-500 bg-emerald-500/10";
    case "queued": return "text-sky-500 bg-sky-500/10";
    case "skipped": return "text-[var(--text-muted)] bg-[var(--border)]/40";
    case "failed": return "text-red-500 bg-red-500/10";
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

/** Latest record for an email regardless of expiry — used to show the
 *  most recently observed state on inbox rows and thread headers. */
export function latestRecord(records: TriageActionRecord[], emailId: string): TriageActionRecord | undefined {
  let latest: TriageActionRecord | undefined;
  for (const r of records) {
    if (r.emailId !== emailId) continue;
    if (!latest || r.at >= latest.at) latest = r;
  }
  return latest;
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

export interface TriageActionInput {
  emailId: string;
  emailSubject: string;
  from: string;
  brief: string;
}

function extractEmailAddress(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  if (/^\S+@\S+\.\S+$/.test(from.trim())) return from.trim();
  return null;
}

/**
 * Execute a triage action and return the resulting record (queued / applied /
 * skipped / failed). Shared by TriageQueues and EmailDetail so the same set
 * of side effects, retries, and error messages applies everywhere.
 */
export async function runTriageAction(
  input: TriageActionInput,
  kind: TriageActionKind,
): Promise<TriageActionRecord> {
  const base: TriageActionRecord = {
    emailId: input.emailId,
    emailSubject: input.emailSubject,
    kind,
    state: "applied",
    at: Date.now(),
  };

  try {
    if (kind === "summarize") {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(input.brief);
      return { ...base, state: "applied", message: "Brief copied to clipboard" };
    }
    if (kind === "reply") {
      const addr = extractEmailAddress(input.from);
      if (!addr) return { ...base, state: "failed", message: "No reply address found" };
      const subject = input.emailSubject.startsWith("Re:")
        ? input.emailSubject
        : `Re: ${input.emailSubject}`;
      const url = `mailto:${addr}?subject=${encodeURIComponent(subject)}`;
      // window.open returns null for mailto: in most browsers; only treat
      // null as failure for non-mailto URLs.
      const win = window.open(url, "_blank");
      if (win === null && !/^mailto:/.test(url)) {
        return { ...base, state: "failed", message: "Mail client did not open" };
      }
      return { ...base, state: "applied", message: `Replying to ${addr}` };
    }
    if (kind === "defer") {
      return { ...base, state: "queued", snoozeUntil: Date.now() + DEFER_MS, message: "Snoozed 1 day" };
    }
    if (kind === "followup") {
      return { ...base, state: "queued", snoozeUntil: Date.now() + FOLLOWUP_MS, message: "Follow-up in 3 days" };
    }
    return { ...base, state: "skipped", message: "Ignored from triage" };
  } catch (err) {
    return { ...base, state: "failed", message: err instanceof Error ? err.message : "Action failed" };
  }
}
