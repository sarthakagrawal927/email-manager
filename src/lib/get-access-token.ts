import { createAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export async function getGmailAccessToken(
  headers: ReadonlyHeaders
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { env } = getCloudflareContext() as any;
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) return null;

  // better-auth's getAccessToken returns the stored Google access token
  // and transparently refreshes it (via the stored refresh token —
  // accessType: "offline") when it is about to expire. The previous raw
  // `SELECT accessToken FROM account` never refreshed, so Gmail calls
  // started failing with 401 an hour after sign-in and the client
  // force-signed the user out.
  try {
    const tokens = await auth.api.getAccessToken({
      body: { providerId: "google", userId: session.user.id },
      headers,
    });
    return tokens?.accessToken ?? null;
  } catch (err) {
    console.error(
      "getGmailAccessToken: failed to get/refresh Google access token:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
