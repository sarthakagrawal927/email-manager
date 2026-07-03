'use client';

import { useMemo } from 'react';
import type { Email } from '@/lib/gmail';
import { senderName, triageEmails, triageSummary, type TriageItem } from '@/lib/triage';
import { useTriageActions } from '@/components/TriageActionsProvider';
import { TriageActionBar, TriageStateBadge } from '@/components/TriageActionBar';
import { TriageQueueLedger } from '@/components/TriageQueueLedger';
import { actionLabel, stateClass, stateLabel } from '@/lib/triage-actions';

interface Props {
  emails: Email[];
  loading: boolean;
  error?: string | null;
  selectedId?: string | null;
  onSelect: (email: Email) => void;
  onRefresh: () => void;
  onOpenInbox?: () => void;
  onNavigateFilters?: () => void;
  onStartSession?: () => void;
}

function priorityClass(priority: TriageItem['priority']) {
  if (priority === 'high') return 'text-red-500 bg-red-500/10';
  if (priority === 'medium') return 'text-amber-500 bg-amber-500/10';
  return 'text-[var(--text-muted)] bg-[var(--border)]/40';
}

function formatRelative(ms: number, now: number) {
  const delta = Math.max(0, ms - now);
  if (delta < 60_000) return '<1m';
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h`;
  return `${Math.round(delta / 86_400_000)}d`;
}

export function TriageQueues({
  emails,
  loading,
  error,
  selectedId,
  onSelect,
  onRefresh,
  onOpenInbox,
  onNavigateFilters,
  onStartSession,
}: Props) {
  const { records, activeMap, counts, now, latestFor } = useTriageActions();

  const allQueues = triageEmails(emails);
  const queues = allQueues.map((queue) => ({
    ...queue,
    items: queue.items.filter((item) => !activeMap.has(item.id)),
  }));
  const summary = triageSummary(queues);
  const recent = records.slice(-5).reverse();
  const totalProcessed = counts.applied + counts.queued + counts.skipped + counts.failed;

  // Snoozed follow-up items — queued records with a future snoozeUntil.
  const followUps = records
    .filter((r) => r.state === 'queued' && r.snoozeUntil && r.snoozeUntil > now)
    .sort((a, b) => (a.snoozeUntil ?? 0) - (b.snoozeUntil ?? 0))
    .slice(0, 10);

  const flatItems = useMemo(
    () => queues.flatMap((queue) => queue.items.map((item) => ({ queue, item }))),
    [queues]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--border)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Today</h1>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Queued, applied, failed, and ignored actions stay visible as you work.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onStartSession && (
              <button
                type="button"
                onClick={onStartSession}
                title="Keyboard triage: d defer · f follow-up · s summarize · j/k move · Esc exit"
                className="rounded-lg border border-[var(--accent)]/50 px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10 cursor-pointer"
              >
                ⌨ Triage session
              </button>
            )}
            {onOpenInbox && (
              <button
                type="button"
                onClick={onOpenInbox}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--border)]/40 cursor-pointer"
              >
                Full inbox
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <TriageQueueLedger remaining={summary.total} className="mt-3" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : loading && emails.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">No inbox messages loaded yet.</p>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              Load inbox
            </button>
          </div>
        ) : summary.total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Inbox zero for this batch.
              {counts.queued > 0
                ? ` ${counts.queued} item${counts.queued === 1 ? '' : 's'} will reappear when snoozed time elapses.`
                : ' Refresh to pull the next batch.'}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              Pull next batch
            </button>
          </div>
        ) : (
          <>
            {/* Follow-up capture panel — snoozed items coming due */}
            {followUps.length > 0 && (
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Follow-ups
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {followUps.map((r, idx) => (
                    <li
                      key={`${r.emailId}-${r.at}-${idx}`}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span className="shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-sky-500">
                        {r.snoozeUntil ? formatRelative(r.snoozeUntil, now) : 'due'}
                      </span>
                      <span className="truncate text-[var(--text)]">{r.emailSubject}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {totalProcessed > 0 && (
              <div className="border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Recent actions
                  </h2>
                  {counts.failed > 0 && (
                    <span className="text-[10px] text-red-500">{counts.failed} failed</span>
                  )}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {recent.map((r, idx) => (
                    <li
                      key={`${r.emailId}-${r.at}-${idx}`}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 ${stateClass(r.state)}`}
                      >
                        {stateLabel(r.state)}
                      </span>
                      <span className="shrink-0 text-[var(--text-muted)]">
                        {actionLabel(r.kind)}
                      </span>
                      <span className="truncate">{r.emailSubject}</span>
                      {r.state === 'queued' && r.snoozeUntil && (
                        <span className="shrink-0 text-[var(--text-muted)]">
                          {formatRelative(r.snoozeUntil, now)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="divide-y divide-[var(--border)]">
              {flatItems.map(({ queue, item }) => {
                const selected = item.email.id === selectedId;
                const lastRecord = latestFor(item.email.id);
                const lastFailed = lastRecord?.state === 'failed';
                return (
                  <article
                    key={item.id}
                    className={`px-4 py-3 transition ${
                      selected ? 'bg-[var(--accent)]/[0.08]' : 'hover:bg-[var(--border)]/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(item.email)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] ${priorityClass(item.priority)}`}
                            >
                              {item.priority}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {queue.title}
                            </span>
                            <TriageStateBadge emailId={item.email.id} />
                            {queue.id === 'unsubscribe' && onNavigateFilters && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateFilters();
                                }}
                                className="text-[10px] text-[var(--accent)] hover:underline"
                              >
                                → Filters
                              </button>
                            )}
                          </div>
                          <h3 className="mt-1 truncate text-sm font-medium">
                            {item.email.subject}
                          </h3>
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {senderName(item.email)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                          {new Date(item.email.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">
                        {item.email.snippet}
                      </p>
                    </button>

                    {lastFailed && lastRecord.message && (
                      <p className="mt-1 text-[11px] text-red-500">{lastRecord.message}</p>
                    )}

                    {selected && (
                      <div className="mt-2">
                        <TriageActionBar
                          compact
                          input={{
                            emailId: item.email.id,
                            emailSubject: item.email.subject,
                            from: item.email.from,
                            brief: item.brief,
                          }}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
