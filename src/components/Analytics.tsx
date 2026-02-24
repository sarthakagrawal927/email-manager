"use client";

import { useState, useEffect, useCallback } from "react";
import type { Email } from "@/lib/gmail";

interface SenderStat {
  domain: string;
  displayName: string;
  count: number;
  unsubscribeLink: string | null;
  unsubscribePost: boolean;
}

const BUCKET_OPTIONS = [
  { label: "Last 50", value: 50 },
  { label: "Last 100", value: 100 },
  { label: "Last 250", value: 250 },
  { label: "Last 500", value: 500 },
];

export function Analytics() {
  const [stats, setStats] = useState<SenderStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEmails, setTotalEmails] = useState(0);
  const [bucket, setBucket] = useState(100);

  const fetchAnalytics = useCallback(async (maxResults: number) => {
    setLoading(true);
    setStats([]);
    try {
      const res = await fetch(`/api/emails?label=INBOX&maxResults=${maxResults}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const emails: Email[] = data.emails ?? [];
      setTotalEmails(emails.length);

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

      const sorted = Array.from(domainMap.values()).sort((a, b) => b.count - a.count);
      setStats(sorted);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(bucket);
  }, [bucket, fetchAnalytics]);

  const maxCount = stats[0]?.count ?? 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sender Analytics</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {loading
                ? "Loading..."
                : `${stats.length} unique senders across ${totalEmails} emails`}
            </p>
          </div>
          <div className="flex gap-1 bg-[var(--border)]/50 rounded-lg p-0.5">
            {BUCKET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBucket(opt.value)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  bucket === opt.value
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : stats.length === 0 ? (
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
