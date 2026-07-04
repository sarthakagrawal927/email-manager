'use client';

import { Brain, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Email } from '@/lib/gmail';
import { storeEmail, getEmailsWithoutEmbedding } from '@/lib/db';
import { embed, prepareEmailText } from '@/lib/embeddings';
import { useMailboxStore } from '@/components/MailboxStoreProvider';
import { semanticSearch, type SearchResult } from '@/lib/semantic-search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Props {
  onSelect: (email: Email) => void;
}

export function SemanticSearch({ onSelect }: Props) {
  const { total, indexed, syncing, progress, syncInbox, refresh } = useMailboxStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
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

  async function handleSync() {
    setIndexing(true);
    setIndexProgress('');
    try {
      await syncInbox();

      const unembedded = await getEmailsWithoutEmbedding();
      if (unembedded.length > 0) {
        if (mountedRef.current) setIndexProgress('Loading AI model...');
        await embed('warmup');

        for (let i = 0; i < unembedded.length; i++) {
          if (!mountedRef.current) break;
          setIndexProgress(`Indexing ${i + 1} of ${unembedded.length}...`);
          const text = prepareEmailText(unembedded[i]);
          const embedding = await embed(text);
          await storeEmail({ ...unembedded[i], embedding });
        }
      }

      if (mountedRef.current) {
        setIndexProgress('');
        await refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      if (mountedRef.current) setIndexProgress(`Error: ${message}`);
    } finally {
      if (mountedRef.current) setIndexing(false);
    }
  }

  const busy = syncing || indexing;
  const statusMessage = indexProgress || progress;

  async function performSearch(q: string) {
    setSearching(true);
    setSearchError(null);
    try {
      const res = await semanticSearch(q);
      if (mountedRef.current) setResults(res);
    } catch (err) {
      console.error('Semantic search error:', err);
      if (mountedRef.current) {
        setResults([]);
        setSearchError(
          'Search failed. The local AI model may not have loaded — try syncing again.'
        );
      }
    } finally {
      if (mountedRef.current) setSearching(false);
    }
  }

  const indexPct = total > 0 ? Math.round((indexed / total) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-card)]/30">
      <PageHeader
        title="Semantic search"
        description="Query by meaning — embeddings run entirely in your browser."
        actions={
          <Button type="button" onClick={handleSync} disabled={busy}>
            <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} aria-hidden />
            {busy ? 'Syncing…' : 'Sync & Index'}
          </Button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <Badge variant="secondary">
              <Brain className="mr-1 inline h-3 w-3" aria-hidden />
              {indexed} / {total} indexed
            </Badge>
            {total > 0 ? <Badge variant="outline">{indexPct}% ready</Badge> : null}
            {statusMessage ? <span>{statusMessage}</span> : null}
            {searching && !statusMessage ? <Spinner className="h-4 w-4" /> : null}
          </div>
        }
      />

      <div className="border-b border-[var(--border)]/80 px-5 py-4">
        <div className="relative max-w-3xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <Input
            type="text"
            placeholder={
              indexed > 0
                ? 'Try: "lease renewal from last spring" or "flight confirmation"'
                : 'Sync emails first to enable semantic search'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={indexed === 0}
            className="h-11 pl-10 text-[15px]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {searchError ? (
          <EmptyState
            icon={Sparkles}
            title="Search unavailable"
            description={searchError}
            action={{ label: 'Try again', onClick: () => performSearch(query) }}
          />
        ) : results.length === 0 && query && !searching ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`Nothing in your local index matched "${query}". Try different wording.`}
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={Brain}
            title={indexed === 0 ? 'Index your inbox first' : 'Search by meaning'}
            description={
              indexed === 0
                ? 'Sync up to 500 inbox messages and generate on-device embeddings.'
                : 'Describe what you remember — Kinetic ranks results by cosine similarity.'
            }
            action={indexed === 0 ? { label: 'Sync & Index', onClick: handleSync } : undefined}
          />
        ) : (
          <div className="divide-y divide-[var(--border)]/70">
            {results.map(({ email, score }) => (
              <button
                key={email.id}
                type="button"
                onClick={() => onSelect(email)}
                className="w-full cursor-pointer px-5 py-4 text-left transition-colors hover:bg-[var(--bg-elevated)]/80"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {email.from.replace(/<[^>]+>/, '').trim()}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{(score * 100).toFixed(0)}% match</Badge>
                    <span className="text-xs tabular-nums text-[var(--text-muted)]">
                      {new Date(email.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="truncate text-sm font-medium">{email.subject}</p>
                <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{email.snippet}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
