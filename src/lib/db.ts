import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Email } from "./gmail";

export interface StoredEmail extends Email {
  embedding: number[] | null;
}

interface EmailDB extends DBSchema {
  emails: {
    key: string;
    value: StoredEmail;
    indexes: { "by-date": string };
  };
}

const DB_NAME = "email-search";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EmailDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EmailDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("emails")) {
          const store = db.createObjectStore("emails", { keyPath: "id" });
          store.createIndex("by-date", "date");
        }
      },
    });
  }
  return dbPromise;
}

export async function storeEmails(emails: StoredEmail[]) {
  const db = await getDB();
  const tx = db.transaction("emails", "readwrite");
  await Promise.all([...emails.map((e) => tx.store.put(e)), tx.done]);
}

export async function storeEmail(email: StoredEmail) {
  const db = await getDB();
  await db.put("emails", email);
}

export async function getAllEmails(): Promise<StoredEmail[]> {
  const db = await getDB();
  return db.getAll("emails");
}

export async function getEmailsWithoutEmbedding(): Promise<StoredEmail[]> {
  const db = await getDB();
  const all = await db.getAll("emails");
  return all.filter((e) => !e.embedding);
}

export async function getEmailCount(): Promise<number> {
  const db = await getDB();
  return db.count("emails");
}

export async function getIndexedCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("emails");
  return all.filter((e) => e.embedding).length;
}
