import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Email } from './gmail';

export interface StoredEmail extends Email {
  embedding: number[] | null;
}

export interface InboxSyncMeta {
  nextPageToken?: string;
  exhausted: boolean;
  lastSyncedAt: string | null;
  /**
   * Sanitized, durable record of the most recent unresolved sync failure.
   * Contains NO message content, addresses, subjects, or credentials — only
   * the failing stage, a coarse error class, and the timestamp. Cleared on
   * the next successful sync. Null when the last sync completed cleanly.
   */
  lastError?: {
    stage: 'fetch_page' | 'store' | 'auth' | 'network';
    /** Coarse class: http_4xx | http_5xx | http_429 | network | auth | unknown */
    class: string;
    at: string;
  } | null;
}

interface EmailDB extends DBSchema {
  emails: {
    key: string;
    value: StoredEmail;
    indexes: { 'by-date': string };
  };
  meta: {
    key: string;
    value: InboxSyncMeta;
  };
}

const DB_NAME = 'email-search';
const DB_VERSION = 2;
const INBOX_SYNC_META_KEY = 'inbox-sync';

let dbPromise: Promise<IDBPDatabase<EmailDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EmailDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('emails')) {
          const store = db.createObjectStore('emails', { keyPath: 'id' });
          store.createIndex('by-date', 'date');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

export async function storeEmails(emails: StoredEmail[]) {
  const db = await getDB();
  const tx = db.transaction('emails', 'readwrite');
  await Promise.all([...emails.map((e) => tx.store.put(e)), tx.done]);
}

export async function storeEmail(email: StoredEmail) {
  const db = await getDB();
  await db.put('emails', email);
}

export async function getAllEmails(): Promise<StoredEmail[]> {
  const db = await getDB();
  return db.getAll('emails');
}

export async function getInboxEmailsSorted(): Promise<StoredEmail[]> {
  const all = await getAllEmails();
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getEmailsWithoutEmbedding(): Promise<StoredEmail[]> {
  const db = await getDB();
  const all = await db.getAll('emails');
  return all.filter((e) => !e.embedding);
}

export async function getEmailCount(): Promise<number> {
  const db = await getDB();
  return db.count('emails');
}

export async function getIndexedCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll('emails');
  return all.filter((e) => e.embedding).length;
}

export async function getPendingIndexCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll('emails');
  return all.filter((e) => !e.embedding).length;
}

export async function getInboxSyncMeta(): Promise<InboxSyncMeta> {
  const db = await getDB();
  const stored = await db.get('meta', INBOX_SYNC_META_KEY);
  return (
    stored ?? {
      nextPageToken: undefined,
      exhausted: false,
      lastSyncedAt: null,
    }
  );
}

export async function setInboxSyncMeta(meta: InboxSyncMeta): Promise<void> {
  const db = await getDB();
  await db.put('meta', meta, INBOX_SYNC_META_KEY);
}
