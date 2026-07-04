'use client';

import { useState } from 'react';
import { trackCoreAction } from '@/lib/analytics';
import { useMailboxStore } from '@/components/MailboxStoreProvider';
import { buildWeeklyDigest, type WeeklyDigest } from '@/lib/digest';

interface Props {
  onOpenSender?: (senderEmail: string) => void;
  onOpenThread?: (threadId: string, subject: string) => void;
}

function formatQuietDays(days: number): string {
  if (days < 30) return `${days}d quiet`;
  const months = Math.round(days / 30);
  return `${months}mo quiet`;
}

function revisitReasonLabel(reason: 'starred_stale' | 'long_thread_stale'): string {
  return reason === 'starred_stale' ? 'Starred · stale' : 'Long thread · stale';
}

export function WeeklyDigestView({ onOpenSender, onOpenThread }: Props) {
  const { emails, total, syncInbox } = useMailboxStore();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      if (emails.length === 0) {
        setDigest(null);
        setError('No locally cached emails yet. Sync your inbox from the sidebar.');
        return;
      }
      setDigest(buildWeeklyDigest(emails));
      trackCoreAction('digest_generated');
    } catch {
      setError('Could not read local email cache.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--border)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Weekly digest</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Quiet relationships, threads to revisit, and weekly themes — built locally from your
              cached inbox. No message bodies leave this device.
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {total === 0
                ? 'Local inbox index is empty.'
                : `${total.toLocaleString()} email${total === 1 ? '' : 's'} in shared local index.`}
            </p>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Generating…' : 'Generate this week'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
            {total === 0 && (
              <button
                type="button"
                onClick={() => void syncInbox()}
                className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
              >
                Sync inbox
              </button>
            )}
          </div>
        )}

        {!digest && !error && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Generate a reflection loop from emails already stored in your browser. Run Semantic
              Search sync first if the cache is empty.
            </p>
            <button
              type="button"
              onClick={generate}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              Generate this week
            </button>
          </div>
        )}

        {digest && (
          <div className="mx-auto max-w-3xl space-y-8">
            <p className="text-xs text-[var(--text-muted)]">
              Week {digest.periodStart} – {digest.periodEnd} · generated{' '}
              {new Date(digest.generatedAt).toLocaleString()}
            </p>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Quiet relationships
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Historically active senders with no recent mail.
              </p>
              {digest.relationshipsQuiet.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">None this week.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {digest.relationshipsQuiet.map((item) => (
                    <li
                      key={item.senderEmail}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.displayName}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {item.senderEmail}
                          </p>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            {item.priorMessageCount} prior messages · last{' '}
                            {new Date(item.lastMessageAt).toLocaleDateString()} ·{' '}
                            {formatQuietDays(item.quietDays)}
                          </p>
                        </div>
                        {onOpenSender && (
                          <button
                            type="button"
                            onClick={() => onOpenSender(item.senderEmail)}
                            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/40 cursor-pointer"
                          >
                            Open sender
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Threads to revisit
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Starred or long threads that have gone stale.
              </p>
              {digest.threadsToRevisit.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">None flagged.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {digest.threadsToRevisit.map((item) => (
                    <li
                      key={item.threadId}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.subject || '(no subject)'}</p>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            {item.messageCount} messages · last{' '}
                            {new Date(item.lastMessageAt).toLocaleDateString()} ·{' '}
                            {revisitReasonLabel(item.reason)}
                          </p>
                        </div>
                        {onOpenThread && (
                          <button
                            type="button"
                            onClick={() => onOpenThread(item.threadId, item.subject)}
                            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/40 cursor-pointer"
                          >
                            Open thread
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Weekly themes
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Subject-pattern buckets for mail received this week.
              </p>
              {digest.weeklyThemes.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">No themes in this window.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {digest.weeklyThemes.map((theme) => (
                    <li
                      key={theme.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{theme.label}</p>
                        <span className="text-sm text-[var(--text-muted)]">
                          {theme.messageCount} message{theme.messageCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      {theme.topDomains.length > 0 && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Top domains: {theme.topDomains.join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
