import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getGmailAccessToken } from "@/lib/get-access-token";
import { getEmail } from "@/lib/gmail";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getGmailAccessToken(await headers());
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const email = await getEmail(token, id);

    if (!email.unsubscribeLink || !email.unsubscribePost) {
      return NextResponse.json(
        { error: "One-click unsubscribe not supported", fallbackUrl: email.unsubscribeLink },
        { status: 400 }
      );
    }

    // Validate the unsubscribe URL is a public HTTPS endpoint before proxying (SSRF guard)
    let unsubUrl: URL;
    try {
      unsubUrl = new URL(email.unsubscribeLink);
    } catch {
      return NextResponse.json({ error: "Invalid unsubscribe URL" }, { status: 400 });
    }
    if (unsubUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Unsubscribe URL must be HTTPS" }, { status: 400 });
    }

    // RFC 8058: POST to the List-Unsubscribe URL with the body from List-Unsubscribe-Post
    const res = await fetch(unsubUrl.href, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Unsubscribe request failed (${res.status})`, fallbackUrl: email.unsubscribeLink },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Unsubscribe error:", err?.message ?? err);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
