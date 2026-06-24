'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Email } from '@/lib/gmail';
import { TriageStateBadge } from '@/components/TriageActionBar';
import { TriageQueueLedger } from '@/components/TriageQueueLedger';

interface Props {
  emails: Email[];
  loading: boolean;
  search: string;
  label?: string;
  selectedId?: string | null;
  onSearchChange: (q: string) => void;
  onSelect: (email: Email) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  primary?: boolean;
  /** Show triage queue ledger above the message list. */
  triageLedger?: boolean;
}

const LABEL_NAMES: Record<string, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  sent: 'Sent',
  trash: 'Trash',
  today: 'Inbox',
};

export function EmailList({
  emails,
  loading,
  search,
  label,
  selectedId,
  onSearchChange,
  onSelect,
  onLoadMore,
  onRefresh,
  primary,
  triageLedger,
}: Props) {
  const [focusIdx, setFocusIdx] = useState(-1);
  const itemsRef = useRef<HTMLButtonElement[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const safeFocusIdx = emails.length === 0 ? -1 : Math.min(focusIdx, emails.length - 1);

  const unreadCount = useMemo(
    () => emails.filter((e) => e.labelIds.includes('UNREAD')).length,
    [emails]
  );

  useEffect(() => {
    if (emails.length === 0) {
      setFocusIdx(-1);
      return;
    }
    setFocusIdx((current) => Math.min(current, emails.length - 1));
  }, [emails.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isTyping =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (isTyping) return;
      if (emails.length === 0) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, emails.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && safeFocusIdx >= 0) {
        e.preventDefault();
        onSelect(emails[safeFocusIdx]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [emails, safeFocusIdx, onSelect]);

  useEffect(() => {
    if (safeFocusIdx >= 0 && itemsRef.current[safeFocusIdx]) {
      itemsRef.current[safeFocusIdx].scrollIntoView({ block: 'nearest' });
    }
  }, [safeFocusIdx]);

  const title = label ? (LABEL_NAMES[label] ?? label) : 'Mail';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {loading && emails.length === 0
                ? 'Loading…'
                : emails.length === 0
                  ? 'No messages loaded'
                  : `${emails.length} loaded${unreadCount ? ` · ${unreadCount} unread` : ''}`}
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? '…' : 'Refresh'}
            </button>
          )}
        </div>
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search Gmail (try: from:, has:attachment, newer_than:7d)"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-lg bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-[var(--accent)] text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] pointer-events-none hidden sm:inline">
            press /
          </span>
        </div>
        {triageLedger && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Triage queue
            </p>
            <TriageQueueLedger />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" tabIndex={-1}>
        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 px-6 text-center gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              {search ? `No matches for "${search}"` : 'No emails to show.'}
            </p>
            {search ? (
              <button
                onClick={() => onSearchChange('')}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition cursor-pointer"
              >
                Clear search
              </button>
            ) : onRefresh ? (
              <button
                onClick={onRefresh}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
              >
                Refresh
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {emails.map((email, idx) => {
              const unread = email.labelIds.includes('UNREAD');
              const focused = idx === safeFocusIdx;
              const selected = email.id === selectedId;
              return (
                <button
                  key={email.id}
                  ref={(el) => {
                    if (el) itemsRef.current[idx] = el;
                  }}
                  onClick={() => onSelect(email)}
                  onMouseEnter={() => setFocusIdx(idx)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition cursor-pointer ${
                    selected || focused
                      ? 'bg-[var(--accent)]/[0.08]'
                      : unread
                        ? 'bg-[var(--accent)]/[0.03] hover:bg-[var(--border)]/30'
                        : 'hover:bg-[var(--border)]/30'
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="flex items-center gap-2 truncate max-w-[70%]">
                      {unread && (
                        <span
                          className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0"
                          aria-label="unread"
                        />
                      )}
                      <span
                        className={`text-sm truncate ${unread ? 'font-semibold' : 'font-medium text-[var(--text-muted)]'}`}
                      >
                        {email.from.replace(/<[^>]+>/, '').trim()}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 ml-2">
                      <TriageStateBadge emailId={email.id} />
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                  <div className={`text-sm truncate ${unread ? 'font-semibold' : ''}`}>
                    {email.subject}
                  </div>
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
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
            {primary && (
              <div className="px-4 py-3 text-[10px] text-[var(--text-muted)] text-center">
                Tip: press <kbd className="px-1 rounded bg-[var(--border)]/60">j</kbd> /{' '}
                <kbd className="px-1 rounded bg-[var(--border)]/60">k</kbd> to move,{' '}
                <kbd className="px-1 rounded bg-[var(--border)]/60">Enter</kbd> to open,{' '}
                <kbd className="px-1 rounded bg-[var(--border)]/60">/</kbd> to search
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
