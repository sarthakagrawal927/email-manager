import { createAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

function methodNotAllowed(message: string) {
  return Response.json(
    { code: "METHOD_NOT_ALLOWED", message },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

async function handler(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { env } = getCloudflareContext() as any;
  return createAuth(env).handler(req);
}

export function GET(req: NextRequest) {
  if (new URL(req.url).pathname.endsWith("/sign-in/social")) {
    return methodNotAllowed(
      "Use POST /api/auth/sign-in/social with a JSON body containing provider.",
    );
  }

  return handler(req);
}

export { handler as POST };
