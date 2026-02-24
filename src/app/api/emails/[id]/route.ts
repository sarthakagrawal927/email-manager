import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getEmail, modifyEmail, trashEmail } from "@/lib/gmail";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const { addLabels = [], removeLabels = [] } = await req.json();
    await modifyEmail(token, id, addLabels, removeLabels);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/emails/[id] error:", err?.message ?? err);
    const status = err?.code ?? err?.status ?? 500;
    return NextResponse.json(
      { error: err?.message ?? "Failed to modify email" },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await trashEmail(token, id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/emails/[id] error:", err?.message ?? err);
    const status = err?.code ?? err?.status ?? 500;
    return NextResponse.json(
      { error: err?.message ?? "Failed to trash email" },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
