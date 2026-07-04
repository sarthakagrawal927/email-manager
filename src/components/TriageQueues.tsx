'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Email } from '@/lib/gmail';
import { senderName, triageEmails, triageSummary, type TriageItem } from '@/lib/triage';
import { useTriageActions } from '@/components/TriageActionsProvider';
import { TriageActionBar, TriageStateBadge } from '@/components/TriageActionBar';
import { TriageQueueLedger } from '@/components/TriageQueueLedger';
import { ShortcutHelpOverlay } from '@/components/ShortcutHelpOverlay';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Kbd } from '@/components/ui/kbd';
import { PageHeader } from '@/components/ui/page-header';
import { EmailListSkeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { isTypingTarget, sessionKeyAction } from '@/lib/triage-session';
import { actionLabel, stateClass, stateLabel } from '@/lib/triage-actions';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock3, Inbox, Keyboard, ListChecks } from 'lucide-react';

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

const ROW_HINTS = [
  { key: 'd', label: 'defer' },
  { key: 'f', label: 'follow' },
  { key: 's', label: 'summarize' },
];

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
  const { records, activeMap, counts, now, latestFor, runAction } = useTriageActions();

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

  // --- Keyboard-driven batch triage state -------------------------------
  const [focusIdx, setFocusIdx] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const rowRefs = useRef<HTMLButtonElement[]>([]);
  const busyRef = useRef(false);

  const safeFocusIdx = flatItems.length === 0 ? -1 : Math.min(focusIdx, flatItems.length - 1);

  // Reset focus/selection when the queue rebuilds and the indices are stale.
  useEffect(() => {
    if (flatItems.length === 0) {
      setFocusIdx(-1);
      setSelectedIds(new Set());
      return;
    }
    setFocusIdx((current) => Math.min(current, flatItems.length - 1));
  }, [flatItems.length]);

  // Keep the focused row scrolled into view.
  useEffect(() => {
    if (safeFocusIdx >= 0 && rowRefs.current[safeFocusIdx]) {
      rowRefs.current[safeFocusIdx].scrollIntoView({ block: 'nearest' });
    }
  }, [safeFocusIdx]);

  const moveFocus = useCallback(
    (delta: number, extend: boolean) => {
      if (flatItems.length === 0) return;
      setFocusIdx((prev) => {
        const next = Math.max(0, Math.min(prev + delta, flatItems.length - 1));
        if (extend) {
          const from = prev < 0 ? next : prev;
          const lo = Math.min(from, next);
          const hi = Math.max(from, next);
          setSelectedIds((sel) => {
            const nextSet = new Set(sel);
            for (let i = lo; i <= hi; i++) nextSet.add(flatItems[i].item.id);
            return nextSet;
          });
        }
        return next;
      });
    },
    [flatItems]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const actOnSelection = useCallback(
    async (kind: 'defer' | 'followup' | 'summarize') => {
      if (busyRef.current) return;
      const targets =
        selectedIds.size > 0
          ? flatItems.filter(({ item }) => selectedIds.has(item.id))
          : safeFocusIdx >= 0
            ? [flatItems[safeFocusIdx]]
            : [];
      if (targets.length === 0) return;
      busyRef.current = true;
      try {
        await Promise.all(
          targets.map(({ item }) =>
            runAction(
              {
                emailId: item.email.id,
                emailSubject: item.email.subject,
                from: item.email.from,
                brief: item.brief,
              },
              kind
            )
          )
        );
        // Advance focus past the last acted-on item and clear selection.
        const lastIdx = flatItems.findIndex(
          ({ item }) => item.id === targets[targets.length - 1].item.id
        );
        if (lastIdx >= 0 && lastIdx < flatItems.length - 1) {
          setFocusIdx(lastIdx + 1);
        }
        setSelectedIds(new Set());
      } finally {
        busyRef.current = false;
      }
    },
    [flatItems, selectedIds, safeFocusIdx, runAction]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      // `?` toggles help from anywhere (even with no queue).
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      // Navigation keys — shift extends selection.
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(1, e.shiftKey);
        return;
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(-1, e.shiftKey);
        return;
      }

      // Esc clears selection or closes help (help overlay handles its own Esc
      // via its own listener, but we also clear selection here).
      if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          clearSelection();
        }
        return;
      }

      if (flatItems.length === 0) return;

      // Enter opens the focused message.
      if (e.key === 'Enter' && safeFocusIdx >= 0) {
        e.preventDefault();
        onSelect(flatItems[safeFocusIdx].item.email);
        return;
      }

      // Action keys — act on selection or focused item.
      const action = sessionKeyAction(e.key);
      if (action === 'defer' || action === 'followup' || action === 'summarize') {
        e.preventDefault();
        actOnSelection(action);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    flatItems,
    safeFocusIdx,
    selectedIds.size,
    moveFocus,
    clearSelection,
    actOnSelection,
    onSelect,
  ]);

  const selectedCount = selectedIds.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg-card)]/30">
      <ShortcutHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      <PageHeader
        title="Today"
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Keyboard className="inline h-3.5 w-3.5" aria-hidden />
            <Kbd>d</Kbd> defer
            <Kbd>f</Kbd> follow
            <Kbd>s</Kbd> summarize
            <Kbd>?</Kbd> help
          </span>
        }
        actions={
          <>
            {selectedCount > 0 ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)]">
                {selectedCount} selected
              </span>
            ) : null}
            {onStartSession ? (
              <Button type="button" variant="secondary" size="sm" onClick={onStartSession}>
                Focused session
              </Button>
            ) : null}
            {onOpenInbox ? (
              <Button type="button" variant="ghost" size="sm" onClick={onOpenInbox}>
                Full inbox
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </>
        }
        meta={
          <div className="grid gap-3 pt-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="In queue" value={summary.total} icon={ListChecks} tone="accent" />
            <StatCard label="Queued" value={counts.queued} icon={Clock3} tone="warning" />
            <StatCard label="Applied" value={counts.applied} icon={CheckCircle2} tone="success" />
            <StatCard label="Failed" value={counts.failed} icon={AlertCircle} tone="default" />
          </div>
        }
      />

      <div className="border-b border-[var(--border)]/80 px-5 py-3">
        <TriageQueueLedger remaining={summary.total} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" tabIndex={-1}>
        {error ? (
          <EmptyState
            icon={AlertCircle}
            title="Could not load inbox"
            description={error}
            action={{ label: 'Try again', onClick: onRefresh }}
          />
        ) : loading && emails.length === 0 ? (
          <EmailListSkeleton />
        ) : emails.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No messages loaded"
            description="Pull your Gmail inbox to start triaging with keyboard shortcuts."
            action={{ label: 'Load inbox', onClick: onRefresh }}
          />
        ) : summary.total === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Inbox zero for this batch"
            description={
              counts.queued > 0
                ? `${counts.queued} snoozed item${counts.queued === 1 ? '' : 's'} will return when due.`
                : 'Refresh to pull the next batch of messages.'
            }
            action={{ label: 'Pull next batch', onClick: onRefresh }}
          />
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
              {flatItems.map(({ queue, item }, idx) => {
                const selected = item.email.id === selectedId;
                const focused = idx === safeFocusIdx;
                const batchSelected = selectedIds.has(item.id);
                const lastRecord = latestFor(item.email.id);
                const lastFailed = lastRecord?.state === 'failed';
                return (
                  <article
                    key={item.id}
                    className={cn(
                      'border-b border-[var(--border)]/60 px-4 py-3 transition-all duration-150',
                      batchSelected
                        ? 'bg-[var(--accent-soft)]'
                        : focused || selected
                          ? 'bg-[var(--accent)]/[0.06] ring-1 ring-inset ring-[var(--accent)]/15'
                          : 'hover:bg-[var(--bg-elevated)]/70'
                    )}
                  >
                    <button
                      ref={(el) => {
                        if (el) rowRefs.current[idx] = el;
                      }}
                      type="button"
                      onClick={() => onSelect(item.email)}
                      onMouseEnter={() => setFocusIdx(idx)}
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

                    {/* Keyboard shortcut hints — visible on the focused row */}
                    {focused && (
                      <div className="mt-2 flex items-center gap-3">
                        {ROW_HINTS.map((hint) => (
                          <span
                            key={hint.key}
                            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"
                          >
                            <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1.5 py-0.5 font-mono text-[10px]">
                              {hint.key}
                            </kbd>
                            {hint.label}
                          </span>
                        ))}
                        {selectedCount > 1 && (
                          <span className="ml-auto text-[10px] text-[var(--accent)]">
                            acting on {selectedCount}
                          </span>
                        )}
                      </div>
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

            <div className="px-4 py-3 text-center text-[10px] text-[var(--text-muted)]">
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                j
              </kbd>{' '}
              /{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                k
              </kbd>{' '}
              move ·{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                Shift+arrows
              </kbd>{' '}
              select ·{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                d
              </kbd>{' '}
              /{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                f
              </kbd>{' '}
              /{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                s
              </kbd>{' '}
              triage ·{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1 font-mono text-[10px]">
                ?
              </kbd>{' '}
              help
            </div>
          </>
        )}
      </div>
    </div>
  );
}
