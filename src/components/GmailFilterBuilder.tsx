"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackCoreAction } from "@/lib/analytics";
import type { Email } from "@/lib/gmail";
import {
  archiveImpactLabel,
  buildFilterRecipe,
  buildGmailFilterSuggestions,
  buildGmailFilterXml,
  buildRecipeExplanation,
  buildSelectedRecipeSummary,
  suggestedActionLines,
  type GmailFilterSuggestion,
} from "@/lib/filter-builder";

const SAMPLE_OPTIONS = [
  { label: "100", value: 100 },
  { label: "500", value: 500 },
  { label: "1k", value: 1000 },
];

const CATEGORY_LABELS: Record<GmailFilterSuggestion["category"], string> = {
  newsletter: "Newsletters",
  receipt: "Receipts",
  notification: "Notifications",
  followup: "Follow-up",
};

export function GmailFilterBuilder() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [sampleSize, setSampleSize] = useState(500);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const cacheRef = useRef<Email[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const suggestions = useMemo(() => buildGmailFilterSuggestions(emails), [emails]);
  const selectedSuggestions = suggestions.filter((suggestion) => selectedIds.has(suggestion.id));
  const xml = buildGmailFilterXml(selectedSuggestions);
  const explanation = buildRecipeExplanation(selectedSuggestions);
  const recipeSummary = buildSelectedRecipeSummary(selectedSuggestions);

  const fetchPatterns = useCallback(async (target: number) => {
    if (cacheRef.current.length >= target) {
      setEmails(cacheRef.current.slice(0, target));
      setLoading(false);
      setProgress("");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setProgress("Sampling inbox...");

    try {
      const allEmails: Email[] = [];
      let pageToken: string | undefined;

      while (allEmails.length < target) {
        if (controller.signal.aborted) return;

        const params = new URLSearchParams({
          label: "INBOX",
          maxResults: String(Math.min(500, target - allEmails.length)),
          metadataOnly: "true",
        });
        if (pageToken) params.set("pageToken", pageToken);

        setProgress(`Sampling inbox... ${allEmails.length}/${target}`);
        const res = await fetch(`/api/emails?${params}`, { signal: controller.signal });

        if (!res.ok) {
          setError(`Failed to sample inbox (${res.status})`);
          break;
        }

        const data = await res.json();
        const batch: Email[] = data.emails ?? [];
        if (batch.length === 0) break;

        allEmails.push(...batch);
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }

      if (controller.signal.aborted) return;

      if (allEmails.length > cacheRef.current.length) {
        cacheRef.current = allEmails;
      }
      setEmails(allEmails.slice(0, target));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Filter builder fetch error:", err);
      setError("Failed to sample inbox");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setProgress("");
      }
    }
  }, []);

  useEffect(() => {
    fetchPatterns(sampleSize);
    return () => abortRef.current?.abort();
  }, [fetchPatterns, sampleSize]);

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = new Set(suggestions.map((suggestion) => suggestion.id));
      const preserved = new Set([...current].filter((id) => validIds.has(id)));

      if (preserved.size > 0) {
        return preserved;
      }

      return new Set(suggestions.slice(0, 8).map((suggestion) => suggestion.id));
    });
  }, [suggestions]);

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1500);
  }

  function toggleSuggestion(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(suggestions.map((suggestion) => suggestion.id)));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Filter recipe studio</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Sample inbox patterns, review why each recipe exists, and export Gmail-compatible
              filter XML — all locally, read-only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-[var(--border)]/50 p-0.5">
              {SAMPLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSampleSize(opt.value)}
                  disabled={loading}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    sampleSize === opt.value
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  } disabled:opacity-60`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fetchPatterns(sampleSize)}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:bg-[var(--border)]/40 disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Sampling..." : "Refresh sample"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "sampled", value: emails.length },
            { label: "recipes", value: suggestions.length },
            { label: "selected", value: selectedSuggestions.length },
            {
              label: "would skip inbox",
              value: selectedSuggestions.filter((item) => item.shouldArchive).length,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                {metric.label}
              </div>
              <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-xs text-[var(--text-muted)]">{progress}</p>
        </div>
      ) : error ? (
        <div className="mt-20 text-center">
          <p className="text-[var(--text-muted)]">{error}</p>
          <button
            type="button"
            onClick={() => fetchPatterns(sampleSize)}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="mt-20 text-center text-[var(--text-muted)]">
          No repeated filter patterns found in the sampled inbox.
        </div>
      ) : (
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Recipe candidates</h2>
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/40 cursor-pointer"
              >
                {selectedIds.size === suggestions.length ? "Clear all" : "Select all"}
              </button>
            </div>

            {suggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className={`rounded-xl border bg-[var(--bg-card)] p-4 transition ${
                  selectedIds.has(suggestion.id)
                    ? "border-[var(--accent)]/40"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(suggestion.id)}
                    onChange={() => toggleSuggestion(suggestion.id)}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    aria-label={`Select ${suggestion.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                        {CATEGORY_LABELS[suggestion.category]}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {suggestion.matchCount} matches · {suggestion.confidence}% confidence
                      </span>
                    </div>
                    <h3 className="mt-2 font-medium">{suggestion.displayName}</h3>
                    <p className="mt-1 break-all text-xs text-[var(--text-muted)]">
                      {suggestion.senderEmail}
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-[var(--bg)] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Match rationale
                        </div>
                        <p className="mt-1 text-sm">{suggestion.reason}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--bg)] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Suggested action
                        </div>
                        <ul className="mt-1 space-y-0.5 text-sm">
                          {suggestedActionLines(suggestion).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text)]">Archive impact: </span>
                      {archiveImpactLabel(suggestion)}
                    </p>

                    <div className="mt-3 rounded-lg bg-[var(--bg)] p-3">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        Gmail search
                      </div>
                      <p className="mt-1 break-all font-mono text-xs">{suggestion.searchQuery}</p>
                    </div>

                    {suggestion.sampleSubjects.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {suggestion.sampleSubjects.map((subject) => (
                          <p key={subject} className="truncate text-xs text-[var(--text-muted)]">
                            {subject}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(suggestion.id, buildFilterRecipe(suggestion))}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] cursor-pointer"
                      >
                        {copied === suggestion.id ? "Copied" : "Copy recipe"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit space-y-4 xl:sticky xl:top-5">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h2 className="font-semibold">Selected recipes</h2>
              {selectedSuggestions.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Select candidates to preview the export.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {selectedSuggestions.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs"
                    >
                      <p className="font-medium">{suggestion.displayName}</p>
                      <p className="text-[var(--text-muted)]">
                        {CATEGORY_LABELS[suggestion.category]} · {archiveImpactLabel(suggestion)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Export preview</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyText("summary", recipeSummary)}
                    disabled={selectedSuggestions.length === 0}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--border)]/40 disabled:opacity-50 cursor-pointer"
                  >
                    {copied === "summary" ? "Copied" : "Copy summary"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyText("xml", xml);
                      trackCoreAction("filter_installed");
                    }}
                    disabled={selectedSuggestions.length === 0}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer"
                  >
                    {copied === "xml" ? "Copied" : "Copy XML"}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">{explanation}</p>
              <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg bg-[var(--bg)] p-3 text-xs leading-5 text-[var(--text-muted)]">
                {selectedSuggestions.length === 0 ? "Select recipes to build Gmail filter XML." : xml}
              </pre>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
