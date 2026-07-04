import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'shrink-0 border-b border-[var(--border)]/80 bg-[var(--bg-card)]/50 px-5 py-4 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
          {description ? (
            <div className="text-sm text-[var(--text-muted)] text-pretty">{description}</div>
          ) : null}
          {meta ? <div className="pt-1">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
