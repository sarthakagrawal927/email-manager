import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getGmailAccessToken } from "@/lib/get-access-token";
import { getEmail } from "@/lib/gmail";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getGmailAccessToken(await headers());
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const email = await getEmail(token, id);
    return NextResponse.json(email);
  } catch (err: any) {
    console.error("GET /api/emails/[id] error:", err?.message ?? err);
    const status = typeof (err?.status ?? err?.code) === "number" ? (err.status ?? err.code) : 500;
    const clientMsg = status === 429 ? "Too many requests, try again later" : "Failed to fetch email";
    return NextResponse.json({ error: clientMsg }, { status });
  }
}
