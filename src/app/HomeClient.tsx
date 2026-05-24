"use client";

import { signIn, signOut } from "@/lib/auth-client";
import { useSession } from "@/lib/use-session";
import {
  trackActivated,
  trackCoreAction,
  trackReturned,
  trackSignup,
} from "@/lib/analytics";
import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { Subscriptions } from "@/components/Subscriptions";
import { Analytics } from "@/components/Analytics";
import { SemanticSearch } from "@/components/SemanticSearch";
import { TriageQueues } from "@/components/TriageQueues";
import { GmailFilterBuilder } from "@/components/GmailFilterBuilder";
import { WorkSurface } from "@/components/WorkSurface";
import { TriageActionsProvider } from "@/components/TriageActionsProvider";
import type { Email } from "@/lib/gmail";

type View =
  | "today"
  | "inbox"
  | "starred"
  | "sent"
  | "trash"
  | "subscriptions"
  | "analytics"
  | "search"
  | "filters";

const VIEWS = new Set<string>([
  "today",
  "inbox",
  "starred",
  "sent",
  "trash",
  "subscriptions",
  "analytics",
  "search",
  "filters",
]);

const LABEL_MAP: Record<string, string> = {
  today: "INBOX",
  inbox: "INBOX",
  starred: "STARRED",
  sent: "SENT",
  trash: "TRASH",
};

function getViewFromHash(): View {
  if (typeof window === "undefined") return "today";
  const hash = window.location.hash.replace("#", "");
  return VIEWS.has(hash) ? (hash as View) : "today";
}

export default function HomeClient() {
  const { session: sessionData, loading: isPending } = useSession();
  const session = sessionData?.user ? sessionData : null;
  const status = isPending ? "loading" : session ? "authenticated" : "unauthenticated";
  const [view, setViewState] = useState<View>("today");

  useEffect(() => {
    setViewState(getViewFromHash());
    const onHashChange = () => setViewState(getViewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setView = useCallback((v: View) => {
    setViewState(v);
    window.history.pushState(null, "", `#${v}`);
  }, []);

  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fetchingRef = useRef(false);
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
      trackCoreAction("email_opened");
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
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (LABEL_MAP[view]) params.set("label", LABEL_MAP[view]);
        if (search) params.set("q", search);
        if (pageToken) params.set("pageToken", pageToken);

        const res = await fetch(`/api/emails?${params}`);

        if (res.status === 401) {
          signOut();
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          console.error("Email fetch error:", res.status, text);
          setError(`Failed to load emails (${res.status})`);
          return;
        }

        const data = await res.json();

        if (data.error) {
          console.error("Email fetch error:", data.error);
          setError(data.error);
          return;
        }

        if (pageToken) {
          setEmails((prev) => [...prev, ...data.emails]);
        } else {
          setEmails(data.emails ?? []);
        }
        setNextPageToken(data.nextPageToken);
      } catch (err) {
        console.error("Email fetch exception:", err);
        setError("Failed to load emails");
      } finally {
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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Landing onSignIn={() => signIn()} />;
  }

  const isPrimaryView = view === "today" || view === "inbox";
  const viewLabel = view.charAt(0).toUpperCase() + view.slice(1);

  return (
    <div className="flex h-screen">
      <Sidebar
        view={view}
        onNavigate={(v) => setView(v as View)}
        onSignOut={() => signOut()}
        userImage={sessionData?.user?.image ?? undefined}
        userName={sessionData?.user?.name ?? ""}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — hamburger nav below md. */}
        <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[var(--border)]/50 cursor-pointer"
          >
            <span className="text-xl" aria-hidden>
              ☰
            </span>
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-bold text-white">
            K
          </span>
          <span className="text-sm font-semibold">{viewLabel}</span>
        </header>

        <main className="flex flex-1 overflow-hidden">
        <TriageActionsProvider>
        {view === "subscriptions" ? (
          <Subscriptions />
        ) : view === "analytics" ? (
          <Analytics />
        ) : view === "filters" ? (
          <GmailFilterBuilder />
        ) : view === "today" ? (
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
                onOpenInbox={() => setView("inbox")}
                onNavigateFilters={() => setView("filters")}
              />
            }
            detail={
              selected ? (
                <EmailDetail
                  email={selected}
                  onBack={() => setSelected(null)}
                  showBack
                />
              ) : null
            }
          />
        ) : view === "inbox" ? (
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
                />
              }
              detail={
                selected ? (
                  <EmailDetail
                    email={selected}
                    onBack={() => setSelected(null)}
                    showBack
                  />
                ) : null
              }
            />
          )
        ) : selected ? (
          <EmailDetail
            email={selected}
            onBack={() => setSelected(null)}
          />
        ) : view === "search" ? (
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

const LANDING_FEATURES = [
  {
    title: "Triage queues",
    body: "Today view groups your inbox by sender behavior so you clear the noise first and read what matters.",
  },
  {
    title: "Sender analytics",
    body: "See which senders and lists fill your inbox, ranked by volume — the data behind every filter suggestion.",
  },
  {
    title: "One-click unsubscribe",
    body: "RFC 8058 one-click unsubscribe where supported, with a browser fallback for the rest.",
  },
];

const LANDING_STEPS = [
  {
    title: "Connect Gmail",
    body: "Sign in with Google. Kinetic requests read-only access — no compose, send, archive, or delete.",
  },
  {
    title: "Work your inbox",
    body: "Triage by queue, search semantically, and review sender volume — all in one keyboard-driven cockpit.",
  },
  {
    title: "Export filters",
    body: "Turn recurring noise into Gmail filter XML you import directly, so the rules apply even when Kinetic is closed.",
  },
];

function Landing({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
            K
          </span>
          <span className="text-base font-bold">Kinetic</span>
        </div>
        <a
          href="/about"
          className="text-sm text-[var(--text-muted)] underline-offset-2 hover:underline"
        >
          About
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        {/* Hero */}
        <section className="flex flex-col items-center gap-5 py-12 text-center md:py-20">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Triage Gmail without giving up control.
          </h1>
          <p className="max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
            A read-only Gmail cockpit. Your messages and search embeddings stay
            in your browser — there is no server inbox database.
          </p>
          <button
            onClick={onSignIn}
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Continue with Google
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            Read-only access — no compose, send, archive, or delete permissions.
          </p>
        </section>

        {/* Features */}
        <section className="grid gap-4 md:grid-cols-3">
          {LANDING_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {feature.body}
              </p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {LANDING_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing CTA */}
        <section className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <h2 className="text-xl font-bold">Ready to clear the noise?</h2>
          <button
            onClick={onSignIn}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Continue with Google
          </button>
          <p className="text-[11px] text-[var(--text-muted)]">
            By continuing you agree to the{" "}
            <a href="/privacy" className="underline hover:text-[var(--text)]">
              privacy notice
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
