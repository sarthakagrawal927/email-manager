'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Email } from '@/lib/gmail';
import {
  getEmailCount,
  getIndexedCount,
  getInboxEmailsSorted,
  getInboxSyncMeta,
  type StoredEmail,
} from '@/lib/db';
import { DEFAULT_INBOX_SYNC, ensureInboxEmails } from '@/lib/inbox-sync';
import { loadSubscriptionSenders } from '@/lib/subscription-senders';

interface MailboxStoreContextValue {
  emails: StoredEmail[];
  total: number;
  indexed: number;
  syncing: boolean;
  progress: string;
  lastSyncedAt: string | null;
  inboxExhausted: boolean;
  subscriptionSenders: Email[];
  ready: boolean;
  refresh: () => Promise<void>;
  syncInbox: (opts?: { target?: number; metadataOnly?: boolean }) => Promise<void>;
  ensureInboxCount: (target: number, opts?: { metadataOnly?: boolean }) => Promise<StoredEmail[]>;
  getInboxSlice: (limit: number) => StoredEmail[];
}

const MailboxStoreContext = createContext<MailboxStoreContextValue | null>(null);

export function useMailboxStore() {
  const ctx = useContext(MailboxStoreContext);
  if (!ctx) {
    throw new Error('useMailboxStore must be used within MailboxStoreProvider');
  }
  return ctx;
}

/** @deprecated Use useMailboxStore */
export const useInboxIndex = useMailboxStore;

export function MailboxStoreProvider({ children }: { children: ReactNode }) {
  const [emails, setEmails] = useState<StoredEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [indexed, setIndexed] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [inboxExhausted, setInboxExhausted] = useState(false);
  const [subscriptionSenders, setSubscriptionSenders] = useState<Email[]>([]);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);
  const syncLockRef = useRef(false);

  const refresh = useCallback(async () => {
    const [sorted, t, i, senders, meta] = await Promise.all([
      getInboxEmailsSorted(),
      getEmailCount(),
      getIndexedCount(),
      loadSubscriptionSenders(),
      getInboxSyncMeta(),
    ]);
    if (!mountedRef.current) return;
    setEmails(sorted);
    setTotal(t);
    setIndexed(i);
    setSubscriptionSenders(senders);
    setLastSyncedAt(meta.lastSyncedAt);
    setInboxExhausted(meta.exhausted);
    setReady(true);
  }, []);

  const runSync = useCallback(
    async (target: number, metadataOnly = false) => {
      if (syncLockRef.current) return;
      syncLockRef.current = true;
      setSyncing(true);
      setProgress('Syncing inbox…');
      try {
        await ensureInboxEmails({
          target,
          metadataOnly,
          onProgress: (message) => {
            if (mountedRef.current) setProgress(message);
          },
        });
        if (mountedRef.current) {
          setProgress('');
          await refresh();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        if (mountedRef.current) setProgress(`Error: ${message}`);
        throw err;
      } finally {
        syncLockRef.current = false;
        if (mountedRef.current) setSyncing(false);
      }
    },
    [refresh]
  );

  const syncInbox = useCallback(
    async (opts?: { target?: number; metadataOnly?: boolean }) => {
      await runSync(opts?.target ?? DEFAULT_INBOX_SYNC, opts?.metadataOnly ?? false);
    },
    [runSync]
  );

  const ensureInboxCount = useCallback(
    async (target: number, opts?: { metadataOnly?: boolean }) => {
      const current = await getEmailCount();
      if (current >= target) {
        const sorted = await getInboxEmailsSorted();
        return sorted.slice(0, target);
      }
      await runSync(target, opts?.metadataOnly ?? false);
      const sorted = await getInboxEmailsSorted();
      if (mountedRef.current) await refresh();
      return sorted.slice(0, target);
    },
    [refresh, runSync]
  );

  const getInboxSlice = useCallback((limit: number) => emails.slice(0, limit), [emails]);

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      const count = await getEmailCount();
      await refresh();
      if (count === 0) {
        try {
          await runSync(DEFAULT_INBOX_SYNC);
        } catch {
          // Background sync may fail offline — views still render cached state.
        }
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh, runSync]);

  const value = useMemo(
    () => ({
      emails,
      total,
      indexed,
      syncing,
      progress,
      lastSyncedAt,
      inboxExhausted,
      subscriptionSenders,
      ready,
      refresh,
      syncInbox,
      ensureInboxCount,
      getInboxSlice,
    }),
    [
      emails,
      total,
      indexed,
      syncing,
      progress,
      lastSyncedAt,
      inboxExhausted,
      subscriptionSenders,
      ready,
      refresh,
      syncInbox,
      ensureInboxCount,
      getInboxSlice,
    ]
  );

  return <MailboxStoreContext.Provider value={value}>{children}</MailboxStoreContext.Provider>;
}

/** @deprecated Use MailboxStoreProvider */
export const InboxIndexProvider = MailboxStoreProvider;
