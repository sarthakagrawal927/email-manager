'use client';

import { MailOpen } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  list: ReactNode;
  detail: ReactNode | null;
  hasSelection: boolean;
  emptyDetail?: ReactNode;
}

export function WorkSurface({ list, detail, hasSelection, emptyDetail }: Props) {
  const placeholder = emptyDetail ?? (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg)]/30 p-8">
      <Card className="max-w-sm border-dashed bg-[var(--bg-card)]/50 text-center shadow-none">
        <CardHeader className="items-center">
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <MailOpen className="h-5 w-5" aria-hidden />
          </span>
          <CardTitle className="text-base">Select a message</CardTitle>
          <CardDescription className="text-pretty">
            Choose a thread from the queue to read it, triage with shortcuts, or run actions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className={`flex min-h-0 flex-col overflow-hidden border-[var(--border)]/80 ${
          hasSelection
            ? 'hidden w-full md:flex md:w-[min(440px,40%)] md:border-r'
            : 'w-full md:w-[min(440px,40%)] md:border-r'
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
