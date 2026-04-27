"use client";

export type Session = {
  user?: { id: string; email: string; name?: string; image?: string };
  session?: { id: string; expiresAt?: string };
  expiresAt?: string;
} | null;

export async function getSession(): Promise<Session> {
  try {
    const res = await fetch("/api/auth/get-session", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  } catch {
    return null;
  }
}

export function signIn() {
  // better-auth route convention
  window.location.href = "/api/auth/sign-in/social?provider=google";
}

export async function signOut() {
  await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
  window.location.href = "/";
}
