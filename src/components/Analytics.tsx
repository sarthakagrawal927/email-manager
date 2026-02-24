"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Email } from "@/lib/gmail";

interface SenderStat {
  email: string;
  domain: string;
  displayName: string;
  count: number;
  unsubscribeLink: string | null;
  unsubscribePost: boolean;
}

const BUCKET_OPTIONS = [
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "500", value: 500 },
  { label: "1k", value: 1000 },
  { label: "5k", value: 5000 },
];

function formatDateRange(oldest: string, newest: string): string {
  const o = new Date(oldest);
  const n = new Date(newest);
  const diffMs = n.getTime() - o.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diffDays === 0) return `today (${fmtDate(n)})`;
  if (diffDays === 1) return `last 1 day`;
  if (diffDays < 30) return `${diffDays} days (${fmtDate(o)} – ${fmtDate(n)})`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `~${diffMonths} month${diffMonths > 1 ? "s" : ""} (${fmtDate(o)} – ${fmtDate(n)})`;
  const diffYears = (diffDays / 365).toFixed(1);
  return `~${diffYears} years (${fmtDate(o)} – ${fmtDate(n)})`;
}

export function Analytics() {
  const [stats, setStats] = useState<SenderStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [totalEmails, setTotalEmails] = useState(0);
  const [dateRange, setDateRange] = useState("");
  const [bucket, setBucket] = useState(100);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Email[]>([]);

  function computeStats(emails: Email[]) {
    setTotalEmails(emails.length);

    // Compute date range
    if (emails.length > 0) {
      const dates = emails
        .map((e) => new Date(e.date).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);
      if (dates.length > 0) {
        setDateRange(formatDateRange(
          new Date(dates[0]).toISOString(),
          new Date(dates[dates.length - 1]).toISOString()
        ));
      }
    } else {
      setDateRange("");
    }

    // Aggregate by sender email address
    const senderMap = new Map<string, SenderStat>();
    for (const email of emails) {
      const emailMatch = email.from.match(/<([^>]+)>/);
      const senderEmail = (emailMatch?.[1] ?? email.from).toLowerCase().trim();
      const domainMatch = senderEmail.match(/@(.+)/);
      const domain = domainMatch?.[1] ?? "unknown";
      const displayName = email.from.replace(/<[^>]+>/, "").trim() || senderEmail;

      const existing = senderMap.get(senderEmail);
      if (existing) {
        existing.count++;
        if (!existing.unsubscribeLink && email.unsubscribeLink) {
          existing.unsubscribeLink = email.unsubscribeLink;
          existing.unsubscribePost = email.unsubscribePost;
        }
      } else {
        senderMap.set(senderEmail, {
          email: senderEmail,
          domain,
          displayName,
          count: 1,
          unsubscribeLink: email.unsubscribeLink,
          unsubscribePost: email.unsubscribePost,
        });
      }
    }

    setStats(Array.from(senderMap.values()).sort((a, b) => b.count - a.count));
    setLoading(false);
    setProgress("");
  }

  const fetchAnalytics = useCallback(async (target: number) => {
    // If we already have enough cached emails, just recompute from cache
    if (cacheRef.current.length >= target) {
      computeStats(cacheRef.current.slice(0, target));
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setStats([]);
    setProgress("Fetching...");
    setDateRange("");

    try {
      const allEmails: Email[] = [];
      let pageToken: string | undefined;
      const perPage = Math.min(target, 500); // Gmail API caps at 500

      while (allEmails.length < target) {
        if (controller.signal.aborted) return;

        const params = new URLSearchParams({
          label: "INBOX",
          maxResults: String(perPage),
          metadataOnly: "true",
        });
        if (pageToken) params.set("pageToken", pageToken);

        setProgress(`Fetching... ${allEmails.length}/${target}`);

        const res = await fetch(`/api/emails?${params}`, { signal: controller.signal });
        if (!res.ok) break;

        const data = await res.json();
        const emails: Email[] = data.emails ?? [];
        if (emails.length === 0) break;

        allEmails.push(...emails);
        pageToken = data.nextPageToken;
        if (!pageToken) break; // no more pages
      }

      if (controller.signal.aborted) return;

      // Update cache if we fetched more than before
      if (allEmails.length > cacheRef.current.length) {
        cacheRef.current = allEmails;
      }

      computeStats(allEmails.slice(0, target));
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Analytics fetch error:", err);
      setLoading(false);
      setProgress("");
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(bucket);
    return () => abortRef.current?.abort();
  }, [bucket, fetchAnalytics]);

  const [expanded, setExpanded] = useState<string | null>(null);

  function getEmailsForSender(senderEmail: string): Email[] {
    const sliced = cacheRef.current.slice(0, bucket);
    return sliced
      .filter((e) => {
        const m = e.from.match(/<([^>]+)>/);
        const addr = (m?.[1] ?? e.from).toLowerCase().trim();
        return addr === senderEmail;
      })
      .slice(0, 20);
  }

  const maxCount = stats[0]?.count ?? 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Sender Analytics</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {loading
                ? progress
                : `${stats.length} unique senders across ${totalEmails} emails`}
            </p>
            {dateRange && !loading && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Spanning {dateRange}
              </p>
            )}
          </div>
          <div className="flex gap-1 bg-[var(--border)]/50 rounded-lg p-0.5 shrink-0">
            {BUCKET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBucket(opt.value)}
                disabled={loading}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
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
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          {progress && (
            <p className="text-xs text-[var(--text-muted)]">{progress}</p>
          )}
        </div>
      ) : stats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] mt-20">
          No email data to analyze
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {stats.map((sender) => {
            const isExpanded = expanded === sender.email;
            return (
              <div key={sender.email}>
                <div
                  className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-[var(--border)]/30 transition"
                  onClick={() => setExpanded(isExpanded ? null : sender.email)}
                >
                  <span className={`text-xs text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                    ▶
                  </span>
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
                            onClick={(e) => e.stopPropagation()}
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
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{sender.email}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-7 mt-1 mb-2 border-l-2 border-[var(--border)] pl-3 space-y-1">
                    {getEmailsForSender(sender.email).map((email) => (
                      <div
                        key={email.id}
                        className="flex items-baseline gap-2 py-1 text-sm"
                      >
                        <span className="text-xs text-[var(--text-muted)] shrink-0 w-16">
                          {new Date(email.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="truncate">{email.subject}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
