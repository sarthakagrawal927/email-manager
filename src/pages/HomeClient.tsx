'use client';

import { signOut } from '@/lib/auth-client';
import { useSession } from '@/lib/use-session';
import { trackActivated, trackCoreAction, trackReturned, trackSignup } from '@/lib/analytics';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SignInScreen } from '@/components/SignInScreen';
import { MobileMenuButton, Sidebar } from '@/components/Sidebar';
import { EmailList } from '@/components/EmailList';
import { SentMailView } from '@/components/SentMailView';
import { EmailDetail } from '@/components/EmailDetail';
import { Subscriptions } from '@/components/Subscriptions';
import { Analytics } from '@/components/Analytics';
import { SemanticSearch } from '@/components/SemanticSearch';
import { InsightsView } from '@/components/InsightsView';
import { WorkSurface } from '@/components/WorkSurface';
import { MailboxStoreProvider, useMailboxStore } from '@/components/MailboxStoreProvider';
import type { Email } from '@/lib/gmail';

type View = 'inbox' | 'sent' | 'subscriptions' | 'analytics' | 'search' | 'insights';

const VIEWS = new Set<string>([
  'inbox',
  'sent',
  'subscriptions',
  'analytics',
  'search',
  'insights',
]);

const HASH_ALIASES: Record<string, View> = {
  today: 'inbox',
  triage: 'inbox',
  trash: 'inbox',
  starred: 'inbox',
  digest: 'insights',
  filters: 'insights',
};

const LABEL_MAP: Record<string, string> = {
  inbox: 'INBOX',
  sent: 'SENT',
};

function getViewFromHash(): View {
  if (typeof window === 'undefined') return 'inbox';
  const hash = window.location.hash.replace('#', '');
  if (HASH_ALIASES[hash]) return HASH_ALIASES[hash];
  return VIEWS.has(hash) ? (hash as View) : 'inbox';
}

export default function HomeClient() {
  const { session: sessionData, loading: isPending } = useSession();
  const session = sessionData?.user ? sessionData : null;
  const status = isPending ? 'loading' : session ? 'authenticated' : 'unauthenticated';

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  return (
    <MailboxStoreProvider>
      <AuthenticatedHome sessionData={sessionData!} />
    </MailboxStoreProvider>
  );
}

function AuthenticatedHome({
  sessionData,
}: {
  sessionData: { user?: { id: string; name?: string; image?: string } };
}) {
  const mailbox = useMailboxStore();
  const [view, setViewState] = useState<View>('inbox');

  useEffect(() => {
    setViewState(getViewFromHash());
    const onHashChange = () => setViewState(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setView = useCallback((v: View) => {
    setViewState(v);
    window.location.hash = v;
  }, []);

  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchingRef = useRef(false);
  const fetchSeqRef = useRef(0);
  const trackedSessionRef = useRef<string | null>(null);
  const activatedRef = useRef(false);

  // Owner-facing analytics — emit `signup` / `returned` on session start.
  // `signup` fires the first time a user is seen in this browser; `returned`
  // fires on every later session for a user with prior activity.
  useEffect(() => {
    const userId = sessionData?.user?.id;
    if (!userId || trackedSessionRef.current === userId) return;
    trackedSessionRef.current = userId;
    try {
      const key = `email-manager:seen:${userId}`;
      if (window.localStorage.getItem(key)) {
        trackReturned();
      } else {
        window.localStorage.setItem(key, String(Date.now()));
        trackSignup();
      }
    } catch {
      // localStorage may be unavailable — never break on analytics.
    }
  }, [sessionData]);

  // Owner-facing analytics — opening a message is the core action, and the
  // first open is the activation milestone.
  const handleSelectEmail = useCallback((email: Email | null) => {
    setSelected(email);
    if (email) {
      trackCoreAction('email_opened');
      if (!activatedRef.current) {
        activatedRef.current = true;
        trackActivated();
      }
    }
  }, []);

  const fetchEmails = useCallback(
    async (pageToken?: string) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const requestSeq = ++fetchSeqRef.current;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (LABEL_MAP[view]) params.set('label', LABEL_MAP[view]);
        if (search) params.set('q', search);
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`/api/emails?${params}`);

        if (res.status === 401) {
          signOut();
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          console.error('Email fetch error:', res.status, text);
          setError(`Failed to load emails (${res.status})`);
          return;
        }

        const data = await res.json();

        if (data.error) {
          console.error('Email fetch error:', data.error);
          setError(data.error);
          return;
        }

        // Ignore stale responses if the user changed view/search and a
        // newer request has already started.
        if (requestSeq !== fetchSeqRef.current) return;

        if (pageToken) {
          setEmails((prev) => [...prev, ...data.emails]);
        } else {
          setEmails(data.emails ?? []);
        }
        setNextPageToken(data.nextPageToken);
      } catch (err) {
        if (requestSeq !== fetchSeqRef.current) return;
        console.error('Email fetch exception:', err);
        setError('Failed to load emails');
      } finally {
        if (requestSeq !== fetchSeqRef.current) return;
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [view, search]
  );

  const usesCachedInbox = view === 'inbox' && !search;

  useEffect(() => {
    setSelected(null);

    if (view === 'sent') {
      setEmails([]);
      setLoading(false);
      setError(null);
      setNextPageToken(null);
      return;
    }

    if (usesCachedInbox) {
      setEmails(mailbox.emails);
      setLoading(!mailbox.ready || (mailbox.syncing && mailbox.emails.length === 0));
      setError(null);
      setNextPageToken(null);
      return;
    }

    if (LABEL_MAP[view]) fetchEmails();
  }, [view, search, usesCachedInbox, mailbox.emails, mailbox.ready, mailbox.syncing, fetchEmails]);

  const openDigestContext = useCallback(
    (kind: 'sender' | 'thread', value: string, subject?: string) => {
      if (kind === 'sender') {
        setSearch(`from:${value}`);
      } else {
        setSearch(subject ? `subject:"${subject.replace(/"/g, '')}"` : '');
      }
      setSelected(null);
      setView('inbox');
    },
    [setView]
  );

  const refreshMailboxView = useCallback(() => {
    if (usesCachedInbox) {
      void mailbox.syncInbox();
    } else {
      fetchEmails();
    }
  }, [usesCachedInbox, mailbox, fetchEmails]);

  const loadMoreInbox = useCallback(() => {
    if (usesCachedInbox && !mailbox.inboxExhausted) {
      void mailbox.ensureInboxCount(mailbox.total + 100);
      return;
    }
    if (nextPageToken) fetchEmails(nextPageToken);
  }, [usesCachedInbox, mailbox, nextPageToken, fetchEmails]);

  const isPrimaryView = view === 'inbox';
  const viewLabel = view.charAt(0).toUpperCase() + view.slice(1);

  return (
    <div className="app-mesh flex h-screen">
      <Sidebar
        view={view}
        onNavigate={(v) => setView(v as View)}
        onSignOut={() => signOut()}
        userImage={sessionData?.user?.image ?? undefined}
        userName={sessionData?.user?.name ?? ''}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — hamburger nav below md. */}
        <header className="glass-panel flex items-center gap-3 border-b px-3 py-2.5 md:hidden">
          <MobileMenuButton onClick={() => setMobileMenuOpen(true)} label={viewLabel} />
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-[var(--accent-fg)]">
            K
          </span>
          <span className="text-sm font-semibold">{viewLabel}</span>
        </header>

        <main className="flex flex-1 overflow-hidden">
          {view === 'subscriptions' ? (
            <Subscriptions />
          ) : view === 'analytics' ? (
            <Analytics />
          ) : view === 'insights' ? (
            <InsightsView
              onOpenSender={(email) => openDigestContext('sender', email)}
              onOpenThread={(_threadId, subject) => openDigestContext('thread', '', subject)}
            />
          ) : view === 'sent' ? (
            <WorkSurface
              hasSelection={Boolean(selected)}
              list={<SentMailView selectedId={selected?.id} onSelect={handleSelectEmail} />}
              detail={
                selected ? (
                  <EmailDetail email={selected} onBack={() => setSelected(null)} showBack />
                ) : null
              }
            />
          ) : view === 'inbox' ? (
            error ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="max-w-sm space-y-4 px-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">{error}</p>
                  <button
                    onClick={refreshMailboxView}
                    className="cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <WorkSurface
                hasSelection={Boolean(selected)}
                list={
                  <EmailList
                    emails={emails}
                    loading={loading}
                    search={search}
                    label={view}
                    selectedId={selected?.id}
                    onSearchChange={setSearch}
                    onSelect={handleSelectEmail}
                    onRefresh={refreshMailboxView}
                    onLoadMore={
                      usesCachedInbox
                        ? mailbox.inboxExhausted
                          ? undefined
                          : loadMoreInbox
                        : nextPageToken
                          ? loadMoreInbox
                          : undefined
                    }
                    primary={isPrimaryView}
                  />
                }
                detail={
                  selected ? (
                    <EmailDetail email={selected} onBack={() => setSelected(null)} showBack />
                  ) : null
                }
              />
            )
          ) : selected ? (
            <EmailDetail email={selected} onBack={() => setSelected(null)} />
          ) : view === 'search' ? (
            <SemanticSearch onSelect={handleSelectEmail} />
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-sm px-6">
                <p className="text-sm text-[var(--text-muted)]">{error}</p>
                <button
                  onClick={refreshMailboxView}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition cursor-pointer text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <EmailList
              emails={emails}
              loading={loading}
              search={search}
              label={view}
              selectedId={null}
              onSearchChange={setSearch}
              onSelect={handleSelectEmail}
              onRefresh={refreshMailboxView}
              onLoadMore={nextPageToken ? loadMoreInbox : undefined}
              primary={isPrimaryView}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// The previous embedded `Landing` marketing copy lived here. It now
// ships as a static Astro page at landing-astro/src/pages/index.astro,
// overlaid onto .open-next/assets/index.html so the LCP path doesn't
// pay the React-hydration cost. Unauthenticated visits to /app
// redirect to / (see early-return above).
