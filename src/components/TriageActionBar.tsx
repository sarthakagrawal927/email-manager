'use client';

import { useState } from 'react';
import { useTriageActions } from '@/components/TriageActionsProvider';
import {
  actionLabel,
  stateClass,
  stateLabel,
  type TriageActionInput,
  type TriageActionKind,
} from '@/lib/triage-actions';

interface Props {
  input: TriageActionInput;
  compact?: boolean;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function endOfDayMs() {
  const eod = new Date();
  eod.setHours(23, 59, 59, 0);
  return Math.max(HOUR_MS, eod.getTime() - Date.now());
}

const SNOOZE_PRESETS: { label: string; kind: TriageActionKind; ms: () => number }[] = [
  { label: '4h', kind: 'defer', ms: () => 4 * HOUR_MS },
  { label: 'EOD', kind: 'defer', ms: endOfDayMs },
  { label: '1 day', kind: 'defer', ms: () => DAY_MS },
  { label: '3 days', kind: 'followup', ms: () => 3 * DAY_MS },
  { label: '1 week', kind: 'followup', ms: () => 7 * DAY_MS },
];

// Primary actions that don't need sub-selection.
const PRIMARY_ACTIONS: TriageActionKind[] = ['summarize', 'reply', 'skip'];

function formatRelative(ms: number, now: number) {
  const delta = Math.max(0, ms - now);
  if (delta < 60_000) return '<1m';
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h`;
  return `${Math.round(delta / 86_400_000)}d`;
}

export function TriageActionBar({ input, compact }: Props) {
  const { latestFor, runAction, undoLatest, now } = useTriageActions();
  const [running, setRunning] = useState<TriageActionKind | null>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const latest = latestFor(input.emailId);

  async function handle(kind: TriageActionKind, opts?: { snoozeMs?: number }) {
    setRunning(kind);
    setSnoozeOpen(false);
    try {
      await runAction(input, kind, opts);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 ${compact ? '' : 'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3'}`}
    >
      {latest && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 ${stateClass(latest.state)}`}>
            {stateLabel(latest.state)}
          </span>
          <span className="text-[var(--text-muted)]">{actionLabel(latest.kind)}</span>
          {latest.state === 'queued' && latest.snoozeUntil && (
            <span className="text-[var(--text-muted)]">
              · in {formatRelative(latest.snoozeUntil, now)}
            </span>
          )}
          {latest.message && (
            <span
              className={`truncate ${latest.state === 'failed' ? 'text-red-500' : 'text-[var(--text-muted)]'}`}
            >
              {latest.message}
            </span>
          )}
          <button
            type="button"
            onClick={() => undoLatest(input.emailId)}
            className="ml-auto rounded border border-[var(--border)] px-2 py-0.5 transition hover:bg-[var(--border)]/40"
          >
            Undo
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PRIMARY_ACTIONS.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={running !== null}
            onClick={() => handle(kind)}
            className={`rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50 disabled:opacity-60 ${
              kind === 'skip' ? 'text-[var(--text-muted)]' : ''
            }`}
          >
            {running === kind ? '…' : actionLabel(kind)}
          </button>
        ))}

        {/* Snooze picker */}
        <div className="relative">
          <button
            type="button"
            disabled={running !== null}
            onClick={() => setSnoozeOpen((o) => !o)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50 disabled:opacity-60"
          >
            {running === 'defer' || running === 'followup' ? '…' : 'Snooze ▾'}
          </button>

          {snoozeOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-lg">
              {SNOOZE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handle(preset.kind, { snoozeMs: preset.ms() })}
                  className="rounded px-2 py-1 text-xs text-[var(--text)] transition hover:bg-[var(--accent)]/15 whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSnoozeOpen(false)}
                className="rounded px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--border)]/40"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TriageStateBadge({ emailId }: { emailId: string }) {
  const { latestFor, now } = useTriageActions();
  const latest = latestFor(emailId);
  if (!latest) return null;

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${stateClass(latest.state)}`}>
      {stateLabel(latest.state)}
      {latest.state === 'queued' && latest.snoozeUntil
        ? ` · ${formatRelative(latest.snoozeUntil, now)}`
        : ''}
    </span>
  );
}
