'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  list: ReactNode;
  detail: ReactNode | null;
  hasSelection: boolean;
}

/** List-first layout: full-width queue until a message is selected, then split pane. */
export function WorkSurface({ list, detail, hasSelection }: Props) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden transition-[width] duration-200 ease-out',
          hasSelection
            ? 'hidden w-full border-[var(--border)]/60 md:flex md:w-[min(420px,38%)] md:shrink-0 md:border-r'
            : 'w-full'
        )}
      >
        {list}
      </div>

      {hasSelection && detail ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{detail}</div>
      ) : null}
    </div>
  );
}
