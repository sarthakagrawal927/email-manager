"use client";

import { useState, useEffect } from "react";
import type { Email } from "@/lib/gmail";

interface Props {
  email: Email;
  onBack: () => void;
  onRefresh: () => void;
}

export function EmailDetail({ email, onBack, onRefresh }: Props) {
  const [acting, setActing] = useState(false);

  // Auto-mark as read when opened
  useEffect(() => {
    if (email.labelIds.includes("UNREAD")) {
      fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeLabels: ["UNREAD"] }),
      });
      email.labelIds = email.labelIds.filter((l) => l !== "UNREAD");
    }
  }, [email.id]);

  async function act(fn: () => Promise<void>) {
    setActing(true);
    await fn();
    setActing(false);
    onRefresh();
    onBack();
  }

  const isStarred = email.labelIds.includes("STARRED");

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
        <button
          disabled={acting}
          onClick={() =>
            act(async () => {
              await fetch(`/api/emails/${email.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ addLabels: ["UNREAD"] }),
              });
            })
          }
          className="px-3 py-1.5 rounded-lg hover:bg-[var(--border)]/50 text-sm cursor-pointer"
        >
          Mark unread
        </button>
        <button
          disabled={acting}
          onClick={() =>
            act(async () => {
              await fetch(`/api/emails/${email.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  isStarred
                    ? { removeLabels: ["STARRED"] }
                    : { addLabels: ["STARRED"] }
                ),
              });
            })
          }
          className="px-3 py-1.5 rounded-lg hover:bg-[var(--border)]/50 text-sm cursor-pointer"
        >
          {isStarred ? "Unstar" : "Star"}
        </button>
        <button
          disabled={acting}
          onClick={() =>
            act(async () => {
              await fetch(`/api/emails/${email.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ removeLabels: ["INBOX"] }),
              });
            })
          }
          className="px-3 py-1.5 rounded-lg hover:bg-[var(--border)]/50 text-sm cursor-pointer"
        >
          Archive
        </button>
        <button
          disabled={acting}
          onClick={() =>
            act(async () => {
              await fetch(`/api/emails/${email.id}`, { method: "DELETE" });
            })
          }
          className="px-3 py-1.5 rounded-lg hover:bg-[var(--border)]/50 text-sm text-[var(--danger)] cursor-pointer"
        >
          Delete
        </button>
        {email.unsubscribeLink && (
          email.unsubscribePost ? (
            <button
              disabled={acting}
              onClick={() =>
                act(async () => {
                  const res = await fetch(`/api/emails/${email.id}/unsubscribe`, { method: "POST" });
                  const data = await res.json();
                  if (!data.ok && data.fallbackUrl) {
                    window.open(data.fallbackUrl, "_blank", "noopener,noreferrer");
                  }
                })
              }
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
          sandbox="allow-same-origin"
          title="Email body"
        />
      </div>
    </div>
  );
}
