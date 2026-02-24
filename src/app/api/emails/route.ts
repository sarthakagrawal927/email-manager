import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { listEmails, sendEmail } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session as any)?.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Token expired, please sign in again" }, { status: 401 });
  }

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session as any)?.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Token expired, please sign in again" }, { status: 401 });
  }

  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject) {
      return NextResponse.json({ error: "Missing 'to' or 'subject'" }, { status: 400 });
    }
    await sendEmail(token, to, subject, body ?? "");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/emails error:", err?.message ?? err);
    const status = err?.code ?? err?.status ?? 500;
    return NextResponse.json(
      { error: err?.message ?? "Failed to send email" },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
