"use client";

import { signIn, signOut } from "@/lib/auth-client";
import { useSession } from "@/lib/use-session";
import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { Subscriptions } from "@/components/Subscriptions";
import { Analytics } from "@/components/Analytics";
import { SemanticSearch } from "@/components/SemanticSearch";
import { TriageQueues } from "@/components/TriageQueues";
import { GmailFilterBuilder } from "@/components/GmailFilterBuilder";
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
  const fetchingRef = useRef(false);

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
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-base font-bold text-white">
                K
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">Kinetic</p>
                <p className="text-xs text-[var(--text-muted)]">Private Gmail cockpit</p>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-bold leading-snug">
              Triage Gmail without giving up control.
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Read-only access. Messages and embeddings stay in your browser. No server inbox database.
            </p>

            <button
              onClick={() => signIn()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              Continue with Google
            </button>

            <ul className="mt-6 space-y-2 text-xs text-[var(--text-muted)]">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#19a974]" />
                Triage queues, sender analytics, one-click unsubscribe
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#19a974]" />
                Semantic search runs locally via in-browser embeddings
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#19a974]" />
                No compose, send, archive, or delete permissions requested
              </li>
            </ul>

            <p className="mt-6 text-[11px] text-[var(--text-muted)]">
              By continuing you agree to the{" "}
              <a href="/privacy" className="underline hover:text-[var(--text)]">privacy notice</a>.
              Learn more <a href="/about" className="underline hover:text-[var(--text)]">about Kinetic</a>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const isPrimaryView = view === "today" || view === "inbox";

  return (
    <div className="flex h-screen">
      <Sidebar
        view={view}
        onNavigate={(v) => setView(v as View)}
        onSignOut={() => signOut()}
        userImage={sessionData?.user?.image ?? undefined}
        userName={sessionData?.user?.name ?? ""}
      />

      <main className="flex-1 flex overflow-hidden">
        {view === "subscriptions" ? (
          <Subscriptions />
        ) : view === "analytics" ? (
          <Analytics />
        ) : view === "filters" ? (
          <GmailFilterBuilder />
        ) : view === "today" && !selected ? (
          <TriageQueues
            emails={emails}
            loading={loading}
            onSelect={setSelected}
            onRefresh={() => fetchEmails()}
            onOpenInbox={() => setView("inbox")}
          />
        ) : selected ? (
          <EmailDetail
            email={selected}
            onBack={() => setSelected(null)}
          />
        ) : view === "search" ? (
          <SemanticSearch onSelect={setSelected} />
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
            onSearchChange={setSearch}
            onSelect={setSelected}
            onRefresh={() => fetchEmails()}
            onLoadMore={nextPageToken ? () => fetchEmails(nextPageToken) : undefined}
            primary={isPrimaryView}
          />
        )}
      </main>
    </div>
  );
}
