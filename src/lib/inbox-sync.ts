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
export const REFRESH_HEAD_COUNT = 100;

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

/**
 * Re-fetch the newest inbox messages from Gmail and merge into the local cache.
 * Always starts from the top of the inbox so returning users see fresh mail.
 */
export async function refreshInboxHead(options?: {
  maxEmails?: number;
  metadataOnly?: boolean;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}): Promise<number> {
  const maxEmails = options?.maxEmails ?? REFRESH_HEAD_COUNT;
  const existing = await getAllEmails();
  const embeddingById = new Map(existing.map((e) => [e.id, e.embedding]));

  let fetched = 0;
  let pageToken: string | undefined;

  options?.onProgress?.('Checking for new mail…');

  do {
    if (options?.signal?.aborted) break;

    const params = new URLSearchParams({
      label: 'INBOX',
      maxResults: String(Math.min(100, maxEmails - fetched)),
    });
    if (options?.metadataOnly) params.set('metadataOnly', 'true');
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`/api/emails?${params}`, { signal: options?.signal });
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const batch: Email[] = data.emails ?? [];

    if (batch.length > 0) {
      const toStore: StoredEmail[] = batch.map((e) => ({
        ...e,
        embedding: embeddingById.get(e.id) ?? null,
      }));
      await storeEmails(toStore);
      fetched += batch.length;
      options?.onProgress?.(`Updated ${fetched} recent emails…`);
    }

    pageToken = data.nextPageToken ?? undefined;
    if (batch.length === 0 || !pageToken) break;
  } while (fetched < maxEmails);

  const meta = await getInboxSyncMeta();
  await setInboxSyncMeta({
    ...meta,
    lastSyncedAt: new Date().toISOString(),
  });

  return fetched;
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
