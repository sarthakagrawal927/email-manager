import {
  getAllEmails,
  getEmailCount,
  getInboxSyncMeta,
  setInboxSyncMeta,
  storeEmails,
  type StoredEmail,
} from './db';
import type { Email } from './gmail';

export const DEFAULT_INBOX_SYNC = 500;

export interface EnsureInboxOptions {
  target: number;
  metadataOnly?: boolean;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}

export interface EnsureInboxResult {
  emails: StoredEmail[];
  fetched: number;
  total: number;
}

/** Fetch inbox pages from Gmail and persist to IndexedDB until target is met or pages end. */
export async function ensureInboxEmails(options: EnsureInboxOptions): Promise<EnsureInboxResult> {
  const { target, metadataOnly = false, onProgress, signal } = options;
  const existing = await getAllEmails();
  const embeddingById = new Map(existing.map((e) => [e.id, e.embedding]));
  const meta = await getInboxSyncMeta();

  let fetchedThisRun = 0;
  let pageToken = meta.exhausted ? undefined : meta.nextPageToken;
  let exhausted = meta.exhausted;

  const startingCount = existing.length;
  if (startingCount >= target || exhausted) {
    onProgress?.(
      startingCount >= target
        ? `${startingCount} emails cached`
        : `${startingCount} emails cached (inbox exhausted)`
    );
    return {
      emails: existing.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      fetched: 0,
      total: startingCount,
    };
  }

  onProgress?.(`Syncing inbox… ${startingCount}/${target}`);

  while ((await getEmailCount()) < target && !exhausted) {
    if (signal?.aborted) break;

    const currentCount = await getEmailCount();
    const params = new URLSearchParams({
      label: 'INBOX',
      maxResults: String(Math.min(500, target - currentCount)),
    });
    if (metadataOnly) params.set('metadataOnly', 'true');
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`/api/emails?${params}`, { signal });
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const batch: Email[] = data.emails ?? [];

    if (batch.length > 0) {
      const toStore: StoredEmail[] = batch.map((e) => ({
        ...e,
        embedding: embeddingById.get(e.id) ?? null,
      }));
      await storeEmails(toStore);
      fetchedThisRun += batch.length;
      onProgress?.(`Syncing inbox… ${currentCount + batch.length}/${target}`);
    }

    pageToken = data.nextPageToken ?? undefined;
    exhausted = batch.length === 0 || !pageToken;

    await setInboxSyncMeta({
      nextPageToken: pageToken,
      exhausted,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  const all = await getAllEmails();
  return {
    emails: all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    fetched: fetchedThisRun,
    total: all.length,
  };
}

/** Convenience wrapper for the default inbox sync size. */
export async function syncInboxFromGmail(options?: {
  maxEmails?: number;
  metadataOnly?: boolean;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}): Promise<number> {
  const result = await ensureInboxEmails({
    target: options?.maxEmails ?? DEFAULT_INBOX_SYNC,
    metadataOnly: options?.metadataOnly,
    onProgress: options?.onProgress,
    signal: options?.signal,
  });
  return result.fetched;
}
