import { createAuth } from "@/lib/auth";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export async function getGmailAccessToken(
  headers: ReadonlyHeaders
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { env } = getCloudflareContext() as any;
  const auth = createAuth(env.DB);
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) return null;

  const db = drizzle(env.DB);
  const result = await db.run(
    sql`SELECT accessToken FROM "account" WHERE userId = ${session.user.id} AND providerId = 'google' ORDER BY createdAt DESC LIMIT 1`
  );

  const row = result.results?.[0] as Record<string, unknown> | undefined;
  return (row?.accessToken as string) ?? null;
}
