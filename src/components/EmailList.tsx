'use client';

import { RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Email } from '@/lib/gmail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmailListSkeleton } from '@/components/ui/skeleton';

import { cn } from '@/lib/utils';

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
}

const LABEL_NAMES: Record<string, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
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
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-card)]/30">
      <PageHeader
        title={title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {loading && emails.length === 0
              ? 'Loading…'
              : emails.length === 0
                ? 'No messages loaded'
                : `${emails.length} loaded`}
            {unreadCount > 0 ? <Badge variant="secondary">{unreadCount} unread</Badge> : null}
          </span>
        }
        actions={
          onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 border-b border-[var(--border)]/80 px-5 py-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <Input
            ref={searchRef}
            type="text"
            placeholder="Search Gmail (from:, has:attachment, newer_than:7d)"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 pl-10 pr-14"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-[10px] text-[var(--text-muted)] sm:inline">
            press <kbd>/</kbd>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" tabIndex={-1}>
        {loading && emails.length === 0 ? (
          <EmailListSkeleton />
        ) : emails.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {search ? `No matches for "${search}"` : 'No emails to show.'}
            </p>
            {search ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onSearchChange('')}
              >
                Clear search
              </Button>
            ) : onRefresh ? (
              <Button type="button" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
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
                  type="button"
                  ref={(el) => {
                    if (el) itemsRef.current[idx] = el;
                  }}
                  onClick={() => onSelect(email)}
                  onMouseEnter={() => setFocusIdx(idx)}
                  className={cn(
                    'w-full cursor-pointer border-b border-[var(--border)]/80 px-4 py-3 text-left transition-all duration-150',
                    selected || focused
                      ? 'bg-[var(--accent)]/10 ring-1 ring-inset ring-[var(--accent)]/25'
                      : unread
                        ? 'bg-[var(--accent)]/[0.04] hover:bg-[var(--bg-elevated)]'
                        : 'hover:bg-[var(--bg-elevated)]'
                  )}
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
            {onLoadMore ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-none py-3 text-[var(--accent)]"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more'}
              </Button>
            ) : null}
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
