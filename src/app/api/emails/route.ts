import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getGmailAccessToken } from "@/lib/get-access-token";
import { listEmails } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const token = await getGmailAccessToken(await headers());
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const label = searchParams.get("label") ?? undefined;
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const maxResults = searchParams.get("maxResults") ? Number(searchParams.get("maxResults")) : undefined;
  const metadataOnly = searchParams.get("metadataOnly") === "true";

  try {
    const result = await listEmails(token, {
      q,
      labelIds: label ? [label] : undefined,
      pageToken,
      maxResults,
      metadataOnly,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/emails error:", err?.message ?? err);
    const status = err?.code ?? err?.status ?? 500;
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch emails" },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
