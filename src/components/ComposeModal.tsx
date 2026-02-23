"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onSent: () => void;
}

export function ComposeModal({ onClose, onSent }: Props) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!to) return;
    setSending(true);
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    setSending(false);
    onSent();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] w-full sm:w-[560px] sm:rounded-xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold">New Message</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl cursor-pointer">
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-0 flex-1 overflow-y-auto">
          <input
            type="email"
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-4 py-2.5 border-b border-[var(--border)] bg-transparent outline-none text-sm"
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-4 py-2.5 border-b border-[var(--border)] bg-transparent outline-none text-sm"
          />
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="px-4 py-2.5 bg-transparent outline-none text-sm resize-none flex-1"
          />
        </div>

        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !to}
            className="px-5 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition text-sm font-medium cursor-pointer"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
