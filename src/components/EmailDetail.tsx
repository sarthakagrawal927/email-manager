"use client";

import { useEffect, useMemo, useState } from "react";
import { trackCoreAction } from "@/lib/analytics";
import type { Email } from "@/lib/gmail";
import { triageItemForEmail } from "@/lib/triage";
import { TriageActionBar } from "@/components/TriageActionBar";

interface Props {
  email: Email;
  onBack: () => void;
  showBack?: boolean;
}

export function EmailDetail({ email, onBack, showBack = true }: Props) {
  const [acting, setActing] = useState(false);

  const triageInput = useMemo(() => {
    const item = triageItemForEmail(email);
    return {
      emailId: email.id,
      emailSubject: email.subject,
      from: email.from,
      brief:
        item?.brief ??
        [`Subject: ${email.subject}`, `From: ${email.from}`, `Context: ${email.snippet}`].join("\n"),
    };
  }, [email]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isTyping =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;
      if (e.key === "Escape" && showBack) onBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, showBack]);

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
      trackCoreAction("unsubscribed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--border)]/50 cursor-pointer md:hidden"
            title="Back (Esc)"
          >
            &larr; Back
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleCopySubject}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--border)]/40 cursor-pointer"
        >
          Copy brief
        </button>
        {email.unsubscribeLink &&
          (email.unsubscribePost ? (
            <button
              type="button"
              disabled={acting}
              onClick={handleOneClickUnsubscribe}
              className="rounded-lg bg-[var(--danger)]/10 px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/20 cursor-pointer"
            >
              Unsubscribe (1-click)
            </button>
          ) : (
            <a
              href={email.unsubscribeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[var(--danger)]/10 px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/20"
            >
              Unsubscribe
            </a>
          ))}
      </div>

      <div className="shrink-0 border-b border-[var(--border)] p-4">
        <h1 className="mb-2 text-lg font-semibold leading-snug">{email.subject}</h1>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-[var(--text-muted)]">
          <span className="truncate">From: {email.from}</span>
          <span className="shrink-0">{new Date(email.date).toLocaleString()}</span>
        </div>
        <div className="mt-2">
          <TriageActionBar input={triageInput} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <iframe
          srcDoc={
            email.body ||
            `<pre style="font-family:inherit;white-space:pre-wrap">${email.snippet}</pre>`
          }
          className="h-full w-full border-0"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          title="Email body"
        />
      </div>
    </div>
  );
}
