import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'default' | 'accent' | 'success' | 'warning';
  className?: string;
}

const toneStyles = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  success: 'bg-[oklch(0.55_0.14_155/0.12)] text-[var(--success)]',
  warning: 'bg-[oklch(0.68_0.15_75/0.12)] text-[var(--warning)]',
};

export function StatCard({ label, value, icon: Icon, tone = 'default', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)]/80 bg-[var(--bg-card)]/80 p-4 shadow-[var(--shadow-soft)] backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            toneStyles[tone]
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}
