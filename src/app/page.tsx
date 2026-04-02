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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Email Manager</h1>
          <p className="text-[var(--text-muted)]">Manage your Gmail — search, read, and unsubscribe.</p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
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
