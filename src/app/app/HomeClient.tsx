"use client";

import { signOut } from "@/lib/auth-client";
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
    // Unauthenticated users at /app bounce to the marketing landing
    // (Astro static page overlaid onto /). Sign-in is launched from
    // there via the CTA which calls auth-client.signIn() through this
    // same code path on return (callbackURL: "/app").
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
    return null;
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

// The previous embedded `Landing` marketing copy lived here. It now
// ships as a static Astro page at landing-astro/src/pages/index.astro,
// overlaid onto .open-next/assets/index.html so the LCP path doesn't
// pay the React-hydration cost. Unauthenticated visits to /app
// redirect to / (see early-return above).
