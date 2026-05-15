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

type View = "inbox" | "triage" | "starred" | "sent" | "trash" | "subscriptions" | "analytics" | "search" | "filters";

const VIEWS = new Set<string>(["inbox", "triage", "starred", "sent", "trash", "subscriptions", "analytics", "search", "filters"]);

const LABEL_MAP: Record<string, string> = {
  inbox: "INBOX",
  triage: "INBOX",
  starred: "STARRED",
  sent: "SENT",
  trash: "TRASH",
};

function getViewFromHash(): View {
  if (typeof window === "undefined") return "inbox";
  const hash = window.location.hash.replace("#", "");
  return VIEWS.has(hash) ? (hash as View) : "inbox";
}

export default function HomeClient() {
  const { session: sessionData, loading: isPending } = useSession();
  const session = sessionData?.user ? sessionData : null;
  const status = isPending ? "loading" : session ? "authenticated" : "unauthenticated";
  const [view, setViewState] = useState<View>("inbox");

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
      <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20">
              K
            </span>
            <div>
              <p className="text-lg font-bold leading-none">Kinetic</p>
              <p className="mt-1 text-xs font-medium uppercase text-[var(--text-muted)]">Private Gmail cockpit</p>
            </div>
          </div>
          <button
            onClick={() => signIn()}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
          >
            Sign in
          </button>
        </nav>

        <main className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1.04fr)] lg:items-center lg:pb-20 lg:pt-12">
          <section className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#19a974]" />
              Gmail read-only, stored locally
            </div>

            <h1 className="text-5xl font-extrabold leading-tight text-[var(--text)] sm:text-6xl">
              Clear the inbox without giving up control.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-muted)]">
              Kinetic turns Gmail into a focused command center for search, triage, sender analytics, and unsubscribes. Your messages and embeddings stay in your browser.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => signIn()}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-6 py-3 text-base font-bold text-white shadow-xl shadow-[var(--accent)]/20 transition hover:bg-[var(--accent-hover)] cursor-pointer"
              >
                Continue with Google
              </button>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-muted)]">
                Requires Gmail read-only permission. No compose, send, archive, or delete access.
              </div>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <dt className="text-2xl font-extrabold text-[var(--accent)]">25</dt>
                <dd className="mt-1 text-xs font-medium text-[var(--text-muted)]">message batches</dd>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <dt className="text-2xl font-extrabold text-[var(--accent)]">AI</dt>
                <dd className="mt-1 text-xs font-medium text-[var(--text-muted)]">semantic search</dd>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <dt className="text-2xl font-extrabold text-[var(--accent)]">0</dt>
                <dd className="mt-1 text-xs font-medium text-[var(--text-muted)]">server inbox DB</dd>
              </div>
            </dl>
          </section>

          <section className="relative">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-2xl shadow-[var(--accent)]/10">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">Today in Gmail</p>
                    <p className="text-xs text-[var(--text-muted)]">Local analysis preview</p>
                  </div>
                  <span className="rounded-lg bg-[#d9f7ef] px-3 py-1 text-xs font-bold text-[#006a63]">
                    Synced
                  </span>
                </div>

                <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                  <aside className="hidden border-r border-[var(--border)] p-4 md:block">
                    {["Inbox", "Triage", "Semantic", "Senders"].map((item, index) => (
                      <div
                        key={item}
                        className={`mb-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                          index === 0
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </aside>

                  <div className="p-4">
                    <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Semantic search</p>
                      <p className="mt-1 text-sm font-semibold">"contracts waiting on my approval"</p>
                    </div>

                    <div className="space-y-3">
                      {[
                        ["AM", "Avery Moore", "Vendor contract needs review", "High intent", "#d9f7ef"],
                        ["PK", "Priya Kapoor", "Follow-up from launch planning", "Reply", "#dee0ff"],
                        ["NL", "Newsletters", "12 senders ready to unsubscribe", "Clean up", "#ffdad6"],
                      ].map(([initials, sender, subject, label, color]) => (
                        <div key={subject} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
                          <div className="flex items-start gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-[var(--text)]"
                              style={{ backgroundColor: color }}
                            >
                              {initials}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-bold">{sender}</p>
                                <span className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
                                  {label}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{subject}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Read-only Gmail", "IndexedDB storage", "One-click unsubscribe"].map((item) => (
                <div key={item} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)]">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

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
        ) : view === "triage" && !selected ? (
          <TriageQueues
            emails={emails}
            loading={loading}
            onSelect={setSelected}
            onRefresh={() => fetchEmails()}
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
            <div className="text-center space-y-4">
              <p className="text-[var(--text-muted)]">{error}</p>
              <button
                onClick={() => fetchEmails()}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <EmailList
            emails={emails}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            onSelect={setSelected}
            onLoadMore={nextPageToken ? () => fetchEmails(nextPageToken) : undefined}
          />
        )}
      </main>
    </div>
  );
}
