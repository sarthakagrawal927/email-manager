'use client';

export type Session = {
  user?: { id: string; email: string; name?: string; image?: string };
  session?: { id: string; expiresAt?: string };
  expiresAt?: string;
} | null;

export async function getSession(): Promise<Session> {
  try {
    const res = await fetch('/api/auth/get-session', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  } catch {
    return null;
  }
}

export async function signIn() {
  const res = await fetch('/api/auth/sign-in/social', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      provider: 'google',
      // After OAuth completes, land users on /app (the cockpit). The
      // marketing landing at / is the Astro static page; signed-in
      // users skip it via the Worker's auth-cookie passthrough +
      // server redirect.
      callbackURL: '/app',
    }),
  });

  if (!res.ok) {
    window.location.href = '/?auth_error=google';
    return;
  }

  const data = (await res.json()) as { url?: string };
  window.location.href = data.url ?? '/app';
}

export async function signOut() {
  await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
}
