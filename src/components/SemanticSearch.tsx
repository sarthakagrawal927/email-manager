"use client";

import { useState, useEffect, useRef } from "react";
import type { Email } from "@/lib/gmail";
import {
  storeEmails,
  storeEmail,
  getEmailCount,
  getIndexedCount,
  getEmailsWithoutEmbedding,
} from "@/lib/db";
import type { StoredEmail } from "@/lib/db";
import { embed, prepareEmailText } from "@/lib/embeddings";
import { semanticSearch, type SearchResult } from "@/lib/semantic-search";

interface Props {
  onSelect: (email: Email) => void;
}

export function SemanticSearch({ onSelect }: Props) {
  const [total, setTotal] = useState(0);
  const [indexed, setIndexed] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    refreshStatus();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!query.trim() || indexed === 0) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => performSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, indexed]);

  async function refreshStatus() {
    const [t, i] = await Promise.all([getEmailCount(), getIndexedCount()]);
    if (mountedRef.current) {
      setTotal(t);
      setIndexed(i);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setProgress("Fetching emails...");
    try {
      let pageToken: string | undefined;
      let fetched = 0;
      const maxEmails = 500;

      do {
        const params = new URLSearchParams({ label: "INBOX" });
        if (pageToken) params.set("pageToken", pageToken);
        const res = await fetch(`/api/emails?${params}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        if (data.emails?.length) {
          const toStore: StoredEmail[] = data.emails.map((e: Email) => ({
            ...e,
            embedding: null,
          }));
          await storeEmails(toStore);
          fetched += data.emails.length;
          if (mountedRef.current) setProgress(`Fetched ${fetched} emails...`);
        }
        pageToken = data.nextPageToken;
      } while (pageToken && fetched < maxEmails);

      const unembedded = await getEmailsWithoutEmbedding();
      if (unembedded.length > 0) {
        if (mountedRef.current) setProgress("Loading AI model...");
        await embed("warmup");

        for (let i = 0; i < unembedded.length; i++) {
          if (!mountedRef.current) break;
          setProgress(`Indexing ${i + 1} of ${unembedded.length}...`);
          const text = prepareEmailText(unembedded[i]);
          const embedding = await embed(text);
          await storeEmail({ ...unembedded[i], embedding });
        }
      }

      if (mountedRef.current) {
        setProgress("");
        await refreshStatus();
      }
    } catch (err: any) {
      if (mountedRef.current) setProgress(`Error: ${err.message}`);
    } finally {
      if (mountedRef.current) setSyncing(false);
    }
  }

  async function performSearch(q: string) {
    setSearching(true);
    try {
      const res = await semanticSearch(q);
      if (mountedRef.current) setResults(res);
    } finally {
      if (mountedRef.current) setSearching(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[var(--border)] flex items-center gap-3">
        <input
          type="text"
          placeholder={
            indexed > 0
              ? "Search by meaning..."
              : "Sync emails first..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={indexed === 0}
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-[var(--accent)] text-sm disabled:opacity-50"
        />
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          {syncing ? "Syncing..." : "Sync & Index"}
        </button>
      </div>

      <div className="px-4 py-1.5 text-xs text-[var(--text-muted)] border-b border-[var(--border)] flex justify-between">
        <span>
          {indexed} of {total} emails indexed
        </span>
        {progress && <span>{progress}</span>}
        {searching && !progress && <span>Searching...</span>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query && !searching ? (
          <div className="text-center text-[var(--text-muted)] mt-20">
            No results found
          </div>
        ) : results.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] mt-20 px-6">
            {indexed === 0
              ? 'Click "Sync & Index" to import your emails for semantic search'
              : 'Search by meaning \u2014 e.g., "emails about project deadlines"'}
          </div>
        ) : (
          results.map(({ email, score }) => (
            <button
              key={email.id}
              onClick={() => onSelect(email)}
              className="w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--border)]/30 transition cursor-pointer"
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium truncate max-w-[70%]">
                  {email.from.replace(/<[^>]+>/, "").trim()}
                </span>
                <div className="flex items-baseline gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-[var(--text-muted)] opacity-60">
                    {(score * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(email.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-sm truncate">{email.subject}</div>
              <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {email.snippet}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
