"use client";

import { useState, useEffect } from "react";
import type { Email } from "@/lib/gmail";

interface SenderStat {
  domain: string;
  displayName: string;
  count: number;
  unsubscribeLink: string | null;
  unsubscribePost: boolean;
}

export function Analytics() {
  const [stats, setStats] = useState<SenderStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEmails, setTotalEmails] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        // Fetch a larger batch to get meaningful analytics
        const res = await fetch("/api/emails?label=INBOX&maxResults=100");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        const emails: Email[] = data.emails ?? [];
        setTotalEmails(emails.length);

        // Aggregate by sender domain
        const domainMap = new Map<string, SenderStat>();
        for (const email of emails) {
          const domainMatch = email.from.match(/@([^>]+)/);
          const domain = domainMatch?.[1]?.toLowerCase() ?? "unknown";
          const displayName = email.from.replace(/<[^>]+>/, "").trim() || domain;

          const existing = domainMap.get(domain);
          if (existing) {
            existing.count++;
            if (!existing.unsubscribeLink && email.unsubscribeLink) {
              existing.unsubscribeLink = email.unsubscribeLink;
              existing.unsubscribePost = email.unsubscribePost;
            }
          } else {
            domainMap.set(domain, {
              domain,
              displayName,
              count: 1,
              unsubscribeLink: email.unsubscribeLink,
              unsubscribePost: email.unsubscribePost,
            });
          }
        }

        // Sort by count descending
        const sorted = Array.from(domainMap.values()).sort((a, b) => b.count - a.count);
        setStats(sorted);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const maxCount = stats[0]?.count ?? 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold">Sender Analytics</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {stats.length} unique senders across {totalEmails} recent emails
        </p>
      </div>

      {stats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] mt-20">
          No email data to analyze
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {stats.map((sender) => (
            <div key={sender.domain} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{sender.displayName}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      {sender.count} email{sender.count !== 1 ? "s" : ""}
                    </span>
                    {sender.unsubscribeLink && (
                      <a
                        href={sender.unsubscribeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--danger)] hover:underline"
                      >
                        unsub
                      </a>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${(sender.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{sender.domain}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
