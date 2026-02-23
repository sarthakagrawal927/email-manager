import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { listEmails, sendEmail } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const label = searchParams.get("label") ?? undefined;
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const result = await listEmails(token, {
    q,
    labelIds: label ? [label] : undefined,
    pageToken,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, subject, body } = await req.json();
  await sendEmail(token, to, subject, body);
  return NextResponse.json({ ok: true });
}
