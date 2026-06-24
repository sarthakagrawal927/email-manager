'use client';

import { useTriageActions } from '@/components/TriageActionsProvider';

interface Props {
  /** When set, show remaining items in the working queue (e.g. from triage heuristics). */
  remaining?: number;
  className?: string;
}

export function TriageQueueLedger({ remaining, className = '' }: Props) {
  const { counts } = useTriageActions();

  const metrics = [
    ...(remaining !== undefined
      ? [{ label: 'remaining', value: remaining, tone: 'text-[var(--text)]' }]
      : []),
    { label: 'applied', value: counts.applied, tone: 'text-emerald-500' },
    { label: 'queued', value: counts.queued, tone: 'text-sky-500' },
    {
      label: 'ignored / failed',
      value: counts.skipped + counts.failed,
      tone: counts.failed > 0 ? 'text-red-500' : 'text-[var(--text-muted)]',
    },
  ];

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
        >
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            {metric.label}
          </div>
          <div className={`text-lg font-semibold ${metric.tone}`}>{metric.value}</div>
        </div>
      ))}
    </div>
  );
}
