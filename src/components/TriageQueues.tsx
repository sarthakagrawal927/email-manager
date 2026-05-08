"use client";

import { useState } from "react";
import type { Email } from "@/lib/gmail";
import { senderName, triageEmails, triageSummary, type TriageItem } from "@/lib/triage";

interface Props {
  emails: Email[];
  loading: boolean;
  onSelect: (email: Email) => void;
  onRefresh: () => void;
}

function priorityClass(priority: TriageItem["priority"]) {
  if (priority === "high") return "text-red-500 bg-red-500/10";
  if (priority === "medium") return "text-amber-500 bg-amber-500/10";
  return "text-[var(--text-muted)] bg-[var(--border)]/40";
}

export function TriageQueues({ emails, loading, onSelect, onRefresh }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const queues = triageEmails(emails).map((queue) => ({
    ...queue,
    items: queue.items.filter((item) => !dismissed.has(item.id)),
  }));
  const summary = triageSummary(queues);

  async function copyBrief(item: TriageItem) {
    await navigator.clipboard.writeText(item.brief);
  }

  function dismiss(id: string) {
    setDismissed((current) => new Set([...current, id]));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">AI Triage</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Local queues from the currently loaded inbox. Actions are safe: open, copy brief, or dismiss locally.
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh inbox"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "triaged", value: summary.total },
            { label: "high priority", value: summary.highPriority },
            { label: "needs response", value: summary.needsResponse },
            { label: "unsubscribe", value: summary.unsubscribeCandidates },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>
      </div>

      {loading && emails.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : summary.total === 0 ? (
        <div className="mt-20 text-center text-[var(--text-muted)]">
          No loaded inbox messages to triage yet.
        </div>
      ) : (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {queues.map((queue) => (
            <section key={queue.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="border-b border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{queue.title}</h2>
                  <span className="rounded-full bg-[var(--border)]/50 px-2.5 py-1 text-xs">
                    {queue.items.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{queue.description}</p>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {queue.items.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--text-muted)]">Nothing in this queue.</p>
                ) : (
                  queue.items.map((item) => (
                    <article key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass(item.priority)}`}>
                              {item.priority}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">{item.reason}</span>
                          </div>
                          <h3 className="mt-2 truncate font-medium">{item.email.subject}</h3>
                          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{senderName(item.email)}</p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--text-muted)]">
                          {new Date(item.email.date).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                        {item.email.snippet}
                      </p>
                      <p className="mt-3 text-sm font-medium">{item.action}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => onSelect(item.email)}
                          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => copyBrief(item)}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/50"
                        >
                          Copy brief
                        </button>
                        <button
                          onClick={() => dismiss(item.id)}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--border)]/50"
                        >
                          Done locally
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
