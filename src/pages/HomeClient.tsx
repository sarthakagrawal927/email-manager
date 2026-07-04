'use client';

import { signOut } from '@/lib/auth-client';
import { useSession } from '@/lib/use-session';
import { trackActivated, trackCoreAction, trackReturned, trackSignup } from '@/lib/analytics';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SignInScreen } from '@/components/SignInScreen';
import { MobileMenuButton, Sidebar } from '@/components/Sidebar';
import { EmailList } from '@/components/EmailList';
import { EmailDetail } from '@/components/EmailDetail';
import { Subscriptions } from '@/components/Subscriptions';
import { Analytics } from '@/components/Analytics';
import { SemanticSearch } from '@/components/SemanticSearch';
import { TriageQueues } from '@/components/TriageQueues';
import { TriageSession } from '@/components/TriageSession';
import { GmailFilterBuilder } from '@/components/GmailFilterBuilder';
import { WeeklyDigestView } from '@/components/WeeklyDigestView';
import { WorkSurface } from '@/components/WorkSurface';
import { TriageActionsProvider } from '@/components/TriageActionsProvider';
import type { Email } from '@/lib/gmail';

type View =
  | 'today'
  | 'inbox'
  | 'starred'
  | 'sent'
  | 'trash'
  | 'subscriptions'
  | 'analytics'
  | 'search'
  | 'digest'
  | 'filters';

const VIEWS = new Set<string>([
  'today',
  'inbox',
  'starred',
  'sent',
  'trash',
  'subscriptions',
  'analytics',
  'search',
  'digest',
  'filters',
]);

const LABEL_MAP: Record<string, string> = {
  today: 'INBOX',
  inbox: 'INBOX',
  starred: 'STARRED',
  sent: 'SENT',
  trash: 'TRASH',
};

function getViewFromHash(): View {
  if (typeof window === 'undefined') return 'today';
  const hash = window.location.hash.replace('#', '');
  return VIEWS.has(hash) ? (hash as View) : 'today';
}

export default function HomeClient() {
  const { session: sessionData, loading: isPending } = useSession();
  const session = sessionData?.user ? sessionData : null;
  const status = isPending ? 'loading' : session ? 'authenticated' : 'unauthenticated';
  const [view, setViewState] = useState<View>('today');

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
  const [triageSession, setTriageSession] = useState(false);

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

  useEffect(() => {
    if (sessionData?.user) {
      setSelected(null);
      if (LABEL_MAP[view]) fetchEmails();
    }
  }, [session, view, fetchEmails, sessionData]);

  // Keyboard triage session lives on the Today queue only — navigating to
  // another view ends it.
  useEffect(() => {
    if (view !== 'today') setTriageSession(false);
  }, [view]);

  const startTriageSession = useCallback(() => {
    setSelected(null);
    setView('today');
    setTriageSession(true);
    trackCoreAction('triage_session_started');
  }, [setView]);

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

  const isPrimaryView = view === 'today' || view === 'inbox';
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
          <TriageActionsProvider>
            {view === 'subscriptions' ? (
              <Subscriptions />
            ) : view === 'analytics' ? (
              <Analytics />
            ) : view === 'digest' ? (
              <WeeklyDigestView
                onOpenSender={(email) => openDigestContext('sender', email)}
                onOpenThread={(_threadId, subject) => openDigestContext('thread', '', subject)}
                onNavigateSearch={() => setView('search')}
              />
            ) : view === 'filters' ? (
              <GmailFilterBuilder />
            ) : view === 'today' && triageSession ? (
              <TriageSession
                emails={emails}
                loading={loading}
                onExit={() => setTriageSession(false)}
              />
            ) : view === 'today' ? (
              <WorkSurface
                hasSelection={Boolean(selected)}
                list={
                  <TriageQueues
                    emails={emails}
                    loading={loading}
                    error={error}
                    selectedId={selected?.id}
                    onSelect={handleSelectEmail}
                    onRefresh={() => fetchEmails()}
                    onOpenInbox={() => setView('inbox')}
                    onNavigateFilters={() => setView('filters')}
                    onStartSession={startTriageSession}
                  />
                }
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
                      onClick={() => fetchEmails()}
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
                      onRefresh={() => fetchEmails()}
                      onLoadMore={nextPageToken ? () => fetchEmails(nextPageToken) : undefined}
                      primary={isPrimaryView}
                      triageLedger
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
                    onClick={() => fetchEmails()}
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
                onRefresh={() => fetchEmails()}
                onLoadMore={nextPageToken ? () => fetchEmails(nextPageToken) : undefined}
                primary={isPrimaryView}
              />
            )}
          </TriageActionsProvider>
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
