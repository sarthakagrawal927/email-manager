import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getEmail } from "@/lib/gmail";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const email = await getEmail(token, id);
    return NextResponse.json(email);
  } catch (err: any) {
    console.error("GET /api/emails/[id] error:", err?.message ?? err);
    const status = err?.code ?? err?.status ?? 500;
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch email" },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
