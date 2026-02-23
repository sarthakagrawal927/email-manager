"use client";

import { useState, useEffect } from "react";
import type { Email } from "@/lib/gmail";

export function Subscriptions() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // search for emails with unsubscribe headers
      const res = await fetch("/api/emails?q=unsubscribe&label=INBOX");
      const data = await res.json();
      // filter to only those with actual unsubscribe links
      const subs = (data.emails ?? []).filter((e: Email) => e.unsubscribeLink);
      // dedupe by sender domain
      const seen = new Set<string>();
      const unique = subs.filter((e: Email) => {
        const domain = e.from.match(/@([^>]+)/)?.[1]?.toLowerCase();
        if (!domain || seen.has(domain)) return false;
        seen.add(domain);
        return true;
      });
      setEmails(unique);
      setLoading(false);
    })();
  }, []);

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
          <a
            href={email.unsubscribeLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm hover:bg-[var(--danger)]/20 transition"
          >
            Unsubscribe
          </a>
        </div>
      ))}
    </div>
  );
}
