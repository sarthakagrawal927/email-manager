"use client";

import { useState } from "react";
import type { Email } from "@/lib/gmail";

interface Props {
  email: Email;
  onBack: () => void;
}

export function EmailDetail({ email, onBack }: Props) {
  const [acting, setActing] = useState(false);

  async function handleOneClickUnsubscribe() {
    setActing(true);
    try {
      const res = await fetch(`/api/emails/${email.id}/unsubscribe`, { method: "POST" });
      const data = await res.json();
      if (!data.ok && data.fallbackUrl) {
        window.open(data.fallbackUrl, "_blank", "noopener,noreferrer");
      }
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
        >
          &larr; Back
        </button>
        <div className="flex-1" />
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
