"use client";

import { useEffect, useState } from "react";
import { trackCoreAction } from "@/lib/analytics";
import type { Email } from "@/lib/gmail";

interface Props {
  email: Email;
  onBack: () => void;
}

export function EmailDetail({ email, onBack }: Props) {
  const [acting, setActing] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isTyping =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;
      if (e.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  async function handleCopySubject() {
    try {
      await navigator.clipboard.writeText(`${email.subject}\n${email.from}\n\n${email.snippet}`);
    } catch {
      // best-effort
    }
  }

  async function handleOneClickUnsubscribe() {
    setActing(true);
    try {
      const res = await fetch(`/api/emails/${email.id}/unsubscribe`, { method: "POST" });
      const data = await res.json();
      if (!data.ok && data.fallbackUrl) {
        window.open(data.fallbackUrl, "_blank", "noopener,noreferrer");
      }
      // Owner-facing analytics — unsubscribing is a core action.
      trackCoreAction("unsubscribed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)] flex-wrap">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg hover:bg-[var(--border)]/50 text-sm cursor-pointer"
          title="Back (Esc)"
        >
          &larr; Back
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCopySubject}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--border)]/40 cursor-pointer"
        >
          Copy brief
        </button>
        {email.unsubscribeLink && (
          email.unsubscribePost ? (
            <button
              disabled={acting}
              onClick={handleOneClickUnsubscribe}
              className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm hover:bg-[var(--danger)]/20 cursor-pointer"
            >
              Unsubscribe (1-click)
            </button>
          ) : (
            <a
              href={email.unsubscribeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm hover:bg-[var(--danger)]/20"
            >
              Unsubscribe
            </a>
          )
        )}
      </div>

      <div className="p-5 border-b border-[var(--border)]">
        <h1 className="text-xl font-semibold mb-2">{email.subject}</h1>
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>From: {email.from}</span>
          <span>{new Date(email.date).toLocaleString()}</span>
        </div>
        <div className="text-sm text-[var(--text-muted)]">To: {email.to}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <iframe
          srcDoc={email.body || `<pre style="font-family:inherit;white-space:pre-wrap">${email.snippet}</pre>`}
          className="w-full h-full border-0"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          title="Email body"
        />
      </div>
    </div>
  );
}
