'use client';

import { useTriageActions } from '@/components/TriageActionsProvider';
import { cn } from '@/lib/utils';

interface Props {
  remaining?: number;
  className?: string;
}

export function TriageQueueLedger({ remaining, className }: Props) {
  const { counts } = useTriageActions();

  const items = [
    ...(remaining !== undefined
      ? [{ label: 'In queue', value: remaining, className: 'text-[var(--text)]' }]
      : []),
    { label: 'Applied', value: counts.applied, className: 'text-[var(--success)]' },
    { label: 'Snoozed', value: counts.queued, className: 'text-sky-400' },
    {
      label: 'Skipped',
      value: counts.skipped + counts.failed,
      className: counts.failed > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]',
    },
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-elevated)]/50 px-4 py-2.5',
        className
      )}
    >
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-5">
          {index > 0 ? (
            <span className="hidden h-4 w-px bg-[var(--border)] sm:block" aria-hidden />
          ) : null}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', item.className)}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
