"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Email } from "@/lib/gmail";
import { senderName, triageEmails, triageSummary, type TriageItem } from "@/lib/triage";
import {
  DEFER_MS,
  FOLLOWUP_MS,
  actionLabel,
  buildActiveMap,
  countByState,
  loadRecords,
  saveRecords,
  stateLabel,
  type TriageActionKind,
  type TriageActionRecord,
  type TriageActionState,
} from "@/lib/triage-actions";

interface Props {
  emails: Email[];
  loading: boolean;
  onSelect: (email: Email) => void;
  onRefresh: () => void;
  onOpenInbox?: () => void;
}

function priorityClass(priority: TriageItem["priority"]) {
  if (priority === "high") return "text-red-500 bg-red-500/10";
  if (priority === "medium") return "text-amber-500 bg-amber-500/10";
  return "text-[var(--text-muted)] bg-[var(--border)]/40";
}

function stateClass(state: TriageActionState) {
  switch (state) {
    case "applied": return "text-emerald-500 bg-emerald-500/10";
    case "queued": return "text-sky-500 bg-sky-500/10";
    case "skipped": return "text-[var(--text-muted)] bg-[var(--border)]/40";
    case "failed": return "text-red-500 bg-red-500/10";
  }
}

function formatRelative(ms: number, now = Date.now()) {
  const delta = Math.max(0, ms - now);
  if (delta < 60_000) return "<1m";
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h`;
  return `${Math.round(delta / 86_400_000)}d`;
}

function extractEmailAddress(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  if (/^\S+@\S+\.\S+$/.test(from.trim())) return from.trim();
  return null;
}

export function TriageQueues({ emails, loading, onSelect, onRefresh, onOpenInbox }: Props) {
  const [records, setRecords] = useState<TriageActionRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  // Re-evaluate snoozes once a minute so deferred items reappear without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const activeMap = useMemo(() => buildActiveMap(records, now), [records, now]);
  const counts = useMemo(() => countByState(records, now), [records, now]);

  const pushRecord = useCallback((record: TriageActionRecord) => {
    setRecords((prev) => {
      const next = [...prev, record];
      saveRecords(next);
      return next;
    });
  }, []);

  const undoLatest = useCallback((emailId: string) => {
    setRecords((prev) => {
      let removedIdx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].emailId === emailId) { removedIdx = i; break; }
      }
      if (removedIdx < 0) return prev;
      const next = [...prev.slice(0, removedIdx), ...prev.slice(removedIdx + 1)];
      saveRecords(next);
      return next;
    });
  }, []);

  const runAction = useCallback(async (item: TriageItem, kind: TriageActionKind) => {
    const base: TriageActionRecord = {
      emailId: item.email.id,
      emailSubject: item.email.subject,
      kind,
      state: "applied",
      at: Date.now(),
    };

    try {
      if (kind === "summarize") {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(item.brief);
        pushRecord({ ...base, state: "applied", message: "Brief copied to clipboard" });
      } else if (kind === "reply") {
        const addr = extractEmailAddress(item.email.from);
        if (!addr) {
          pushRecord({ ...base, state: "failed", message: "No reply address found" });
          return;
        }
        const subject = item.email.subject.startsWith("Re:")
          ? item.email.subject
          : `Re: ${item.email.subject}`;
        const url = `mailto:${addr}?subject=${encodeURIComponent(subject)}`;
        const win = window.open(url, "_blank");
        if (win === null && !/^mailto:/.test(url)) {
          // window.open for mailto: returns null in most browsers — only treat
          // popup-blocker null as failure for non-mailto URLs.
          pushRecord({ ...base, state: "failed", message: "Mail client did not open" });
        } else {
          pushRecord({ ...base, state: "applied", message: `Replying to ${addr}` });
        }
      } else if (kind === "defer") {
        const snoozeUntil = Date.now() + DEFER_MS;
        pushRecord({ ...base, state: "queued", snoozeUntil, message: "Snoozed 1 day" });
      } else if (kind === "followup") {
        const snoozeUntil = Date.now() + FOLLOWUP_MS;
        pushRecord({ ...base, state: "queued", snoozeUntil, message: "Follow-up in 3 days" });
      } else if (kind === "skip") {
        pushRecord({ ...base, state: "skipped", message: "Skipped from triage" });
      }
    } catch (err) {
      pushRecord({
        ...base,
        state: "failed",
        message: err instanceof Error ? err.message : "Action failed",
      });
    }
  }, [pushRecord]);

  const allQueues = triageEmails(emails);
  const queues = allQueues.map((queue) => ({
    ...queue,
    items: queue.items.filter((item) => !activeMap.has(item.id)),
  }));
  const summary = triageSummary(queues);
  const recent = records.slice(-5).reverse();
  const totalProcessed = counts.applied + counts.queued + counts.skipped + counts.failed;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Today</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Process a small batch — every action is tracked as queued, applied, or skipped.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenInbox && (
              <button
                onClick={onOpenInbox}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--border)]/40 cursor-pointer"
              >
                View full inbox
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "remaining", value: summary.total, tone: "text-[var(--text)]" },
            { label: "applied", value: counts.applied, tone: "text-emerald-500" },
            { label: "queued", value: counts.queued, tone: "text-sky-500" },
            { label: "skipped / failed", value: counts.skipped + counts.failed, tone: counts.failed > 0 ? "text-red-500" : "text-[var(--text-muted)]" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{metric.label}</div>
              <div className={`mt-2 text-2xl font-semibold ${metric.tone}`}>{metric.value}</div>
            </div>
          ))}
        </div>

        {totalProcessed > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Recent actions</h2>
              {counts.failed > 0 && (
                <span className="text-xs text-red-500">
                  {counts.failed} failed — retry from the item below
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {recent.map((r, idx) => (
                <li
                  key={`${r.emailId}-${r.at}-${idx}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 ${stateClass(r.state)}`}>
                      {stateLabel(r.state)}
                    </span>
                    <span className="shrink-0 text-[var(--text-muted)]">
                      {actionLabel(r.kind)}
                    </span>
                    <span className="truncate text-[var(--text)]">{r.emailSubject}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[var(--text-muted)]">
                    {r.state === "queued" && r.snoozeUntil && (
                      <span>in {formatRelative(r.snoozeUntil, now)}</span>
                    )}
                    {r.message && r.state !== "queued" && (
                      <span className="hidden sm:inline max-w-[14rem] truncate">{r.message}</span>
                    )}
                    <button
                      onClick={() => undoLatest(r.emailId)}
                      className="rounded border border-[var(--border)] px-2 py-0.5 transition hover:bg-[var(--border)]/40"
                    >
                      Undo
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {loading && emails.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center px-6 gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            No inbox messages loaded yet.
          </p>
          <button
            onClick={onRefresh}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Load inbox
          </button>
        </div>
      ) : summary.total === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center px-6 gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            Inbox zero for this batch. {counts.queued > 0 ? `${counts.queued} item${counts.queued === 1 ? "" : "s"} will reappear when snoozed time elapses.` : "Refresh to pull the next batch."}
          </p>
          <button
            onClick={onRefresh}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Pull next batch
          </button>
        </div>
      ) : (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {queues.map((queue) => (
            <section key={queue.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="border-b border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{queue.title}</h2>
                  <span className="rounded-full bg-[var(--border)]/50 px-2.5 py-1 text-xs">
                    {queue.items.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{queue.description}</p>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {queue.items.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--text-muted)]">Nothing in this queue.</p>
                ) : (
                  queue.items.map((item) => {
                    const lastRecord = records
                      .filter((r) => r.emailId === item.email.id)
                      .slice(-1)[0];
                    const lastFailed = lastRecord?.state === "failed";
                    return (
                      <article key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass(item.priority)}`}>
                                {item.priority}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">{item.reason}</span>
                              {lastFailed && (
                                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
                                  last {actionLabel(lastRecord.kind).toLowerCase()} failed — retry
                                </span>
                              )}
                            </div>
                            <h3 className="mt-2 truncate font-medium">{item.email.subject}</h3>
                            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{senderName(item.email)}</p>
                          </div>
                          <span className="shrink-0 text-xs text-[var(--text-muted)]">
                            {new Date(item.email.date).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                          {item.email.snippet}
                        </p>
                        <p className="mt-3 text-sm font-medium">{item.action}</p>

                        {lastFailed && lastRecord.message && (
                          <p className="mt-2 text-xs text-red-500">{lastRecord.message}</p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => onSelect(item.email)}
                            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => runAction(item, "summarize")}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50"
                          >
                            Summarize
                          </button>
                          <button
                            onClick={() => runAction(item, "reply")}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => runAction(item, "defer")}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50"
                          >
                            Defer 1d
                          </button>
                          <button
                            onClick={() => runAction(item, "followup")}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50"
                          >
                            Follow up 3d
                          </button>
                          <button
                            onClick={() => runAction(item, "skip")}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--border)]/50"
                          >
                            Skip
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
