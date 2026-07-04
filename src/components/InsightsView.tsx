'use client';

import { GmailFilterBuilder } from '@/components/GmailFilterBuilder';
import { WeeklyDigestView } from '@/components/WeeklyDigestView';

interface Props {
  onOpenSender?: (senderEmail: string) => void;
  onOpenThread?: (threadId: string, subject: string) => void;
}

export function InsightsView({ onOpenSender, onOpenThread }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--border)] p-5">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
          Review your week locally, then turn recurring senders into Gmail filter recipes you can
          import — no cloud analysis, read-only.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <WeeklyDigestView embedded onOpenSender={onOpenSender} onOpenThread={onOpenThread} />
        <GmailFilterBuilder embedded />
      </div>
    </div>
  );
}
