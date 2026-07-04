/** How long before a local inbox cache is considered stale. */
export const INBOX_STALE_MS = 60 * 60 * 1000; // 1 hour

export function isInboxStale(lastSyncedAt: string | null, now = Date.now()): boolean {
  if (!lastSyncedAt) return true;
  const synced = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(synced)) return true;
  return now - synced >= INBOX_STALE_MS;
}

/** Human-readable age for sidebar and digest banners. */
export function formatSyncAge(lastSyncedAt: string | null, now = Date.now()): string {
  if (!lastSyncedAt) return 'never synced';
  const synced = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(synced)) return 'unknown';

  const diffMs = now - synced;
  if (diffMs < 60_000) return 'just now';
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `${mins} min ago`;
  }
  if (diffMs < 86_400_000) {
    const hours = Math.floor(diffMs / 3_600_000);
    return `${hours} hr ago`;
  }
  return new Date(synced).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
