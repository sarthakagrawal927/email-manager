"use client";

import type { Email } from "@/lib/gmail";

interface Props {
  emails: Email[];
  loading: boolean;
  search: string;
  onSearchChange: (q: string) => void;
  onSelect: (email: Email) => void;
  onLoadMore?: () => void;
}

export function EmailList({ emails, loading, search, onSearchChange, onSelect, onLoadMore }: Props) {

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[var(--border)]">
        <input
          type="text"
          placeholder="Search emails..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-[var(--accent)] text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] mt-20">No emails found</div>
        ) : (
          <>
            {emails.map((email) => {
              const unread = email.labelIds.includes("UNREAD");
              return (
                <button
                  key={email.id}
                  onClick={() => onSelect(email)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--border)]/30 transition cursor-pointer ${
                    unread ? "bg-[var(--accent)]/[0.03]" : ""
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="flex items-center gap-2 truncate max-w-[70%]">
                      {unread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                      )}
                      <span className={`text-sm truncate ${unread ? "font-semibold" : "font-medium text-[var(--text-muted)]"}`}>
                        {email.from.replace(/<[^>]+>/, "").trim()}
                      </span>
                    </span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">
                      {new Date(email.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`text-sm truncate ${unread ? "font-semibold" : ""}`}>{email.subject}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {email.snippet}
                  </div>
                </button>
              );
            })}
            {onLoadMore && (
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-[var(--accent)] hover:bg-[var(--border)]/30 transition cursor-pointer"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
