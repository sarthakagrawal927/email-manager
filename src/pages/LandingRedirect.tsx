import { useEffect, useState } from 'react';

/**
 * Client-side navigation to `/` must reload the document so Vite/wrangler can
 * serve the static Astro landing instead of the React shell.
 */
export function LandingRedirect() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const key = 'email-manager:landing-reload';
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      setFailed(true);
      return;
    }
    sessionStorage.setItem(key, '1');
    window.location.replace('/');
  }, []);

  if (failed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold">Landing page not built</h1>
        <p className="max-w-sm text-sm text-[var(--text-muted)]">
          Run <code className="rounded bg-[var(--bg-card)] px-1.5 py-0.5">pnpm build:landing</code>{' '}
          or open <a href="http://localhost:8787/">http://localhost:8787/</a> while the API dev
          server is running.
        </p>
      </main>
    );
  }

  return null;
}
