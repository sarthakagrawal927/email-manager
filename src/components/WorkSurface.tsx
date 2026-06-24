'use client';

import type { ReactNode } from 'react';

interface Props {
  list: ReactNode;
  detail: ReactNode | null;
  hasSelection: boolean;
  emptyDetail?: ReactNode;
}

export function WorkSurface({ list, detail, hasSelection, emptyDetail }: Props) {
  const placeholder = emptyDetail ?? (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-[var(--text-muted)]">Select a message to read and run actions.</p>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className={`flex min-h-0 flex-col overflow-hidden border-[var(--border)] ${
          hasSelection
            ? 'hidden w-full md:flex md:w-[min(420px,38%)] md:border-r'
            : 'w-full md:w-[min(420px,38%)] md:border-r'
        }`}
      >
        {list}
      </div>

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          hasSelection ? 'flex' : 'hidden md:flex'
        }`}
      >
        {detail ?? placeholder}
      </div>
    </div>
  );
}
