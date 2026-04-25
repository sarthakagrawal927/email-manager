import { createAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

async function handler(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { env } = getCloudflareContext() as any;
  return createAuth(env.DB).handler(req);
}

export { handler as GET, handler as POST };
