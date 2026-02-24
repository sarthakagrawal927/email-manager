"use client";

import { useState, useEffect } from "react";
import type { Email } from "@/lib/gmail";

export function Subscriptions() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsubbing, setUnsubbing] = useState<Set<string>>(new Set());
  const [unsubbed, setUnsubbed] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/emails?q=unsubscribe&label=INBOX");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        const subs = (data.emails ?? []).filter((e: Email) => e.unsubscribeLink);
        const seen = new Set<string>();
        const unique = subs.filter((e: Email) => {
          const domain = e.from.match(/@([^>]+)/)?.[1]?.toLowerCase();
          if (!domain || seen.has(domain)) return false;
          seen.add(domain);
          return true;
        });
        setEmails(unique);
      } catch (err) {
        console.error("Subscriptions fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleUnsubscribe(email: Email) {
    if (!email.unsubscribePost) {
      // Fallback: open link in new tab
      window.open(email.unsubscribeLink!, "_blank", "noopener,noreferrer");
      return;
    }

    setUnsubbing((prev) => new Set(prev).add(email.id));
    try {
      const res = await fetch(`/api/emails/${email.id}/unsubscribe`, { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        setUnsubbed((prev) => new Set(prev).add(email.id));
      } else if (data.fallbackUrl) {
        window.open(data.fallbackUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(email.unsubscribeLink!, "_blank", "noopener,noreferrer");
    } finally {
      setUnsubbing((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
        No subscriptions found with unsubscribe links
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {emails.length} sender{emails.length !== 1 ? "s" : ""} with unsubscribe links
        </p>
      </div>
      {emails.map((email) => (
        <div
          key={email.id}
          className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">
              {email.from.replace(/<[^>]+>/, "").trim()}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">
              {email.subject}
            </div>
          </div>
          <div className="ml-3 shrink-0 flex items-center gap-2">
            {email.unsubscribePost && (
              <span className="text-xs text-[var(--text-muted)]">1-click</span>
            )}
            {unsubbed.has(email.id) ? (
              <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 text-sm">
                Unsubscribed
              </span>
            ) : (
              <button
                onClick={() => handleUnsubscribe(email)}
                disabled={unsubbing.has(email.id)}
                className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm hover:bg-[var(--danger)]/20 transition cursor-pointer disabled:opacity-50"
              >
                {unsubbing.has(email.id) ? "..." : "Unsubscribe"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
