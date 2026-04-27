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
  const maxResultsRaw = Number(searchParams.get("maxResults"));
  const maxResults = maxResultsRaw > 0 && maxResultsRaw <= 500 ? maxResultsRaw : undefined;
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
    const status = typeof (err?.status ?? err?.code) === "number" ? (err.status ?? err.code) : 500;
    // Do not echo internal error details to the client
    const clientMsg = status === 429 ? "Too many requests, try again later" : "Failed to fetch emails";
    return NextResponse.json({ error: clientMsg }, { status });
  }
}
