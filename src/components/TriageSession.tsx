'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmailDetail } from '@/components/EmailDetail';
import { TriageStateBadge } from '@/components/TriageActionBar';
import { ShortcutHelpOverlay } from '@/components/ShortcutHelpOverlay';
import { useTriageActions } from '@/components/TriageActionsProvider';
import type { Email } from '@/lib/gmail';
import { buildSessionQueue, isTypingTarget, sessionKeyAction } from '@/lib/triage-session';

interface Props {
  emails: Email[];
  loading: boolean;
  onExit: () => void;
}

const LEGEND: { keys: string; label: string }[] = [
  { keys: 'd', label: 'Defer 1d' },
  { keys: 'f', label: 'Follow-up 3d' },
  { keys: 's', label: 'Summarize' },
  { keys: 'j / k', label: 'Next / prev' },
  { keys: '?', label: 'Shortcuts' },
  { keys: 'Esc', label: 'Exit' },
];

/**
 * Keyboard-driven triage session: works through the next batch of
 * unread-but-unsorted messages one at a time. Single keys run the shared
 * triage actions (see `sessionKeyAction`); the queue is snapshotted on entry
 * so acted-on messages keep their place until the session ends.
 */
export function TriageSession({ emails, loading, onExit }: Props) {
  const { records, runAction } = useTriageActions();

  // Snapshot the action ledger at session entry so acting on a message does
  // not reshuffle or shrink the queue mid-session; j/k can revisit handled
  // items. The queue still rebuilds if a fresh email batch arrives.
  const entryRecordsRef = useRef(records);
  const queue = useMemo(() => buildSessionQueue(emails, entryRecordsRef.current), [emails]);

  const [index, setIndex] = useState(0);
  const [handled, setHandled] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const busyRef = useRef(false);

  // `index === queue.length` is the "session complete" position.
  const clamped = Math.min(index, queue.length);
  const current = clamped < queue.length ? queue[clamped] : null;

  const act = useCallback(
    async (kind: 'defer' | 'followup' | 'summarize') => {
      const item = index < queue.length ? queue[index] : undefined;
      if (!item || busyRef.current) return;
      busyRef.current = true;
      try {
        await runAction(
          {
            emailId: item.email.id,
            emailSubject: item.email.subject,
            from: item.email.from,
            brief: item.brief,
          },
          kind
        );
        setHandled((n) => n + 1);
        setIndex((i) => Math.min(i + 1, queue.length));
      } finally {
        busyRef.current = false;
      }
    },
    [queue, index, runAction]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const action = sessionKeyAction(e.key);
      if (!action) return;
      e.preventDefault();
      if (action === 'exit') onExit();
      else if (action === 'help') setHelpOpen((o) => !o);
      else if (action === 'next') setIndex((i) => Math.min(i + 1, queue.length));
      else if (action === 'prev') setIndex((i) => Math.max(i - 1, 0));
      else act(action);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [queue.length, onExit, act]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShortcutHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <h1 className="text-sm font-semibold">Triage session</h1>
        {queue.length > 0 && (
          <span className="text-xs text-[var(--text-muted)]">
            {Math.min(clamped + 1, queue.length)} / {queue.length}
          </span>
        )}
        {current && <TriageStateBadge emailId={current.email.id} />}
        <button
          type="button"
          onClick={onExit}
          className="ml-auto cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--border)]/40"
        >
          Exit (Esc)
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading && emails.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : current ? (
          <>
            <div className="shrink-0 border-b border-[var(--accent)]/20 bg-[var(--accent-soft)] px-5 py-2.5 text-sm">
              <span className="font-medium text-[var(--text)]">{current.reason}</span>
              <span className="mx-2 text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-muted)]">{current.action}</span>
            </div>
            <EmailDetail
              key={current.email.id}
              email={current.email}
              onBack={onExit}
              showBack={false}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-medium">
              {queue.length === 0 ? 'Nothing to triage' : 'Session complete'}
            </p>
            <p className="max-w-sm text-xs text-[var(--text-muted)]">
              {queue.length === 0
                ? 'No unread, unsorted messages in this batch. Refresh the triage queue to pull more.'
                : `${handled} of ${queue.length} message${queue.length === 1 ? '' : 's'} handled. Press k to review, or Esc to go back to Triage.`}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Back to Triage
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-2">
        {LEGEND.map((entry) => (
          <span key={entry.keys} className="flex items-center gap-1.5 text-[11px]">
            <kbd className="rounded border border-[var(--border)] bg-[var(--border)]/30 px-1.5 py-0.5 font-mono text-[10px]">
              {entry.keys}
            </kbd>
            <span className="text-[var(--text-muted)]">{entry.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
