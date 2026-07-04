'use client';

import {
  BarChart3,
  Filter,
  Inbox,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useEffect } from 'react';

import { useMailboxStore } from '@/components/MailboxStoreProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatSyncAge } from '@/lib/sync-age';
import { cn } from '@/lib/utils';

const primaryNav = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'search', label: 'Semantic search', icon: Search },
];

const browseNav = [
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
];

const toolsNav = [
  { id: 'triage', label: 'Triage', icon: Zap },
  { id: 'subscriptions', label: 'Subscriptions', icon: Mail },
  { id: 'digest', label: 'Digest', icon: Newspaper },
  { id: 'filters', label: 'Recipe studio', icon: Filter },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

interface Props {
  view: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  userImage?: string;
  userName: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

function NavGroup({
  label,
  items,
  view,
  onNavigate,
}: {
  label?: string;
  items: { id: string; label: string; icon: typeof Zap }[];
  view: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="mb-3">
      {label ? (
        <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {label}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm transition-all duration-200',
                active
                  ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
              ) : null}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'
                )}
                aria-hidden
              />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MailboxSyncPanel() {
  const { total, indexed, syncing, progress, lastSyncedAt, isStale, syncInbox } = useMailboxStore();

  const syncLabel = syncing ? progress || 'Syncing…' : `Synced ${formatSyncAge(lastSyncedAt)}`;

  return (
    <div className="rounded-xl border border-[var(--border)]/80 bg-[var(--bg-card)]/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Local inbox
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums">
            {total.toLocaleString()} cached
            {indexed > 0 ? (
              <span className="text-[var(--text-muted)] font-normal"> · {indexed} indexed</span>
            ) : null}
          </p>
          <p
            className={cn(
              'mt-0.5 truncate text-[10px]',
              isStale && !syncing
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-[var(--text-muted)]'
            )}
          >
            {syncLabel}
            {isStale && !syncing ? ' · refresh recommended' : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void syncInbox()}
          disabled={syncing}
          aria-label="Sync inbox"
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function SidebarBody({ view, onNavigate, onSignOut, userImage, userName }: Props) {
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="border-b border-[var(--border)]/80 px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)] shadow-[var(--shadow-soft)]">
            K
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Kinetic</p>
            <p className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Sparkles className="h-3 w-3 text-[var(--accent)]" aria-hidden />
              Gmail workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <NavGroup items={primaryNav} view={view} onNavigate={onNavigate} />
        <NavGroup label="Mail" items={browseNav} view={view} onNavigate={onNavigate} />
        <NavGroup label="Tools" items={toolsNav} view={view} onNavigate={onNavigate} />
      </nav>

      <div className="mt-auto shrink-0 border-t border-[var(--border)]/80 px-2.5 py-3">
        <MailboxSyncPanel />
      </div>

      <Separator className="bg-[var(--border)]/80" />

      <div className="flex items-center gap-2.5 p-3">
        <Avatar className="h-9 w-9 ring-2 ring-[var(--border)]">
          {userImage ? <AvatarImage src={userImage} alt="" /> : null}
          <AvatarFallback>{initials || 'K'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={userName}>
            {userName}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">Connected</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          aria-label="Sign out"
          className="text-[var(--text-muted)] hover:text-[var(--danger)]"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

export function Sidebar(props: Props) {
  const { mobileOpen, onClose, onNavigate } = props;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <aside className="hidden h-screen w-[var(--sidebar-width)] shrink-0 flex-col border-r border-[var(--border)]/80 bg-[var(--bg-sidebar)]/95 backdrop-blur-xl md:flex md:min-h-0">
        <SidebarBody {...props} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative flex h-full min-h-0 w-[min(88vw,18rem)] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] shadow-2xl">
            <SidebarBody
              {...props}
              onNavigate={(id) => {
                onNavigate(id);
                onClose?.();
              }}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function MobileMenuButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label="Open menu">
      <Menu className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
