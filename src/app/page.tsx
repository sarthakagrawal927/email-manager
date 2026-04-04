"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { EmailList } from "@/components/EmailList";
import { EmailDetail } from "@/components/EmailDetail";
import { Subscriptions } from "@/components/Subscriptions";
import { Analytics } from "@/components/Analytics";
import { SemanticSearch } from "@/components/SemanticSearch";
import type { Email } from "@/lib/gmail";

type View = "inbox" | "starred" | "sent" | "trash" | "subscriptions" | "analytics" | "search";

const VIEWS = new Set<string>(["inbox", "starred", "sent", "trash", "subscriptions", "analytics", "search"]);

const LABEL_MAP: Record<string, string> = {
  inbox: "INBOX",
  starred: "STARRED",
  sent: "SENT",
  trash: "TRASH",
};

function getViewFromHash(): View {
  if (typeof window === "undefined") return "inbox";
  const hash = window.location.hash.replace("#", "");
  return VIEWS.has(hash) ? (hash as View) : "inbox";
}

export default function Home() {
  const { data: session, status } = useSession();
  const [view, setViewState] = useState<View>("inbox");

  // Sync view from URL hash on mount + popstate
  useEffect(() => {
    setViewState(getViewFromHash());
    const onHashChange = () => setViewState(getViewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Update URL hash when view changes
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
    if (session) {
      setSelected(null);
      if (LABEL_MAP[view]) fetchEmails();
    }
  }, [session, view, fetchEmails]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center">
        {/* Navigation Bar */}
        <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold flex items-center space-x-2">
            <span className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white">K</span>
            <span className="text-[var(--text)]">Kinetic</span>
          </div>
          <button
            onClick={() => signIn("google")}
            className="text-[var(--text)] font-medium hover:text-[var(--accent)] transition"
          >
            Sign In
          </button>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl w-full px-8 py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <h1 className="text-6xl font-extrabold text-[var(--text)] leading-tight">
              Take control of your <br />
              <span className="text-[var(--accent)]">inbox with AI</span>
            </h1>
            <p className="text-xl text-[var(--text-muted)] max-w-xl mx-auto md:mx-0">
              Focus on what matters with intelligent AI-powered email management. Search, read, and unsubscribe effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => signIn("google")}
                className="px-8 py-4 bg-[var(--accent)] text-white rounded-xl font-semibold shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] transition cursor-pointer"
              >
                Get Started Free
              </button>
              <button
                className="px-8 py-4 border-2 border-[var(--border)] text-[var(--text)] rounded-xl font-semibold hover:bg-[var(--bg-card)] transition cursor-pointer"
              >
                Watch Demo
              </button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-xl">
            <div className="aspect-video bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border)] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent" />
              <div className="w-3/4 space-y-4">
                <div className="h-4 w-1/2 bg-[var(--border)] rounded" />
                <div className="h-4 w-3/4 bg-[var(--border)] rounded" />
                <div className="h-32 w-full bg-[var(--border)]/50 rounded-lg border-2 border-dashed border-[var(--border)]" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full bg-[var(--bg-card)] py-20">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8 rounded-2xl space-y-4 hover:bg-[var(--bg)] transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-lg flex items-center justify-center mx-auto text-2xl">🤖</div>
              <h3 className="text-xl font-bold">AI Priority Inbox</h3>
              <p className="text-[var(--text-muted)]">Our AI sorts your emails so you see the important stuff first.</p>
            </div>
            <div className="p-8 rounded-2xl space-y-4 hover:bg-[var(--bg)] transition">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 text-green-600 rounded-lg flex items-center justify-center mx-auto text-2xl">🤝</div>
              <h3 className="text-xl font-bold">Seamless Sync</h3>
              <p className="text-[var(--text-muted)]">Connect your Gmail accounts and manage everything in one place.</p>
            </div>
            <div className="p-8 rounded-2xl space-y-4 hover:bg-[var(--bg)] transition">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 text-purple-600 rounded-lg flex items-center justify-center mx-auto text-2xl">🔒</div>
              <h3 className="text-xl font-bold">Advanced Privacy</h3>
              <p className="text-[var(--text-muted)]">Your data stays your data. We never sell your personal info.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        view={view}
        onNavigate={(v) => setView(v as View)}
        onSignOut={() => signOut()}
        userImage={session.user?.image ?? undefined}
        userName={session.user?.name ?? ""}
      />

      <main className="flex-1 flex overflow-hidden">
        {view === "subscriptions" ? (
          <Subscriptions />
        ) : view === "analytics" ? (
          <Analytics />
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
