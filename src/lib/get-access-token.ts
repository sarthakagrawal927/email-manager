import { auth } from "@/lib/auth";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

function getDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "libsql://email-manager-sarthak927.aws-ap-south-1.turso.io",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client);
}

export async function getGmailAccessToken(
  headers: ReadonlyHeaders
): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) return null;

  const db = getDb();
  const result = await db.run(
    sql`SELECT accessToken FROM "account" WHERE userId = ${session.user.id} AND providerId = 'google' ORDER BY createdAt DESC LIMIT 1`
  );

  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return (row?.accessToken as string) ?? null;
}
