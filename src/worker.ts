import { Hono } from 'hono';

import { createAuth, isGoogleOAuthConfigured, type AuthEnv } from './lib/auth';
import { getGmailAccessToken } from './lib/get-access-token';
import { getEmail, listEmails } from './lib/gmail';
import { SECURITY_HEADERS, withSecurityHeaders } from './lib/security-headers';
import { withTiming } from './lib/timing';

export type Env = AuthEnv & {
  ASSETS: Fetcher;
  NODE_ENV?: string;
};

const AUTH_COOKIE_FRAGMENTS = ['session_token', 'session-token'];
const SPA_PATH_PREFIXES = ['/app', '/about', '/privacy'];
const LANDING_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  await next();
  const response = c.res;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});

function methodNotAllowed(message: string) {
  return Response.json(
    { code: 'METHOD_NOT_ALLOWED', message },
    {
      status: 405,
      headers: {
        Allow: 'POST',
        ...SECURITY_HEADERS,
      },
    }
  );
}

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    auth: {
      googleConfigured: isGoogleOAuthConfigured(c.env),
      baseUrl: c.env.BETTER_AUTH_URL ?? null,
    },
  });
});

app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const path = new URL(c.req.url).pathname;
  if (c.req.method === 'GET' && path.endsWith('/sign-in/social')) {
    return methodNotAllowed(
      'Use POST /api/auth/sign-in/social with a JSON body containing provider.'
    );
  }
  if (
    c.req.method === 'POST' &&
    path.endsWith('/sign-in/social') &&
    !isGoogleOAuthConfigured(c.env)
  ) {
    return c.json(
      {
        code: 'OAUTH_NOT_CONFIGURED',
        message:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .dev.vars (local) or Worker secrets (production).',
      },
      503
    );
  }
  return createAuth(c.env).handler(c.req.raw);
});

app.get('/api/emails', async (c) => {
  const token = await getGmailAccessToken(c.env, c.req.raw.headers);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const { searchParams } = new URL(c.req.url);
  const q = searchParams.get('q') ?? undefined;
  const label = searchParams.get('label') ?? undefined;
  const pageToken = searchParams.get('pageToken') ?? undefined;
  const maxResultsRaw = Number(searchParams.get('maxResults'));
  const maxResults = maxResultsRaw > 0 && maxResultsRaw <= 500 ? maxResultsRaw : undefined;
  const metadataOnly = searchParams.get('metadataOnly') === 'true';

  try {
    const result = await listEmails(token, {
      q,
      labelIds: label ? [label] : undefined,
      pageToken,
      maxResults,
      metadataOnly,
    });
    return c.json(result);
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number; code?: number };
    console.error('GET /api/emails error:', error?.message ?? err);
    const status =
      typeof (error?.status ?? error?.code) === 'number' ? (error.status ?? error.code)! : 500;
    const clientMsg =
      status === 429 ? 'Too many requests, try again later' : 'Failed to fetch emails';
    return c.json({ error: clientMsg }, status as 500);
  }
});

app.get('/api/emails/:id', async (c) => {
  const token = await getGmailAccessToken(c.env, c.req.raw.headers);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const email = await getEmail(token, c.req.param('id'));
    return c.json(email);
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number; code?: number };
    console.error('GET /api/emails/:id error:', error?.message ?? err);
    const status =
      typeof (error?.status ?? error?.code) === 'number' ? (error.status ?? error.code)! : 500;
    const clientMsg =
      status === 429 ? 'Too many requests, try again later' : 'Failed to fetch email';
    return c.json({ error: clientMsg }, status as 500);
  }
});

app.post('/api/emails/:id/unsubscribe', async (c) => {
  const token = await getGmailAccessToken(c.env, c.req.raw.headers);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    // Only the unsubscribe headers are needed here; a metadata fetch avoids
    // downloading and base64-decoding the full message body.
    const email = await getEmail(token, c.req.param('id'), { metadataOnly: true });

    if (!email.unsubscribeLink || !email.unsubscribePost) {
      return c.json(
        { error: 'One-click unsubscribe not supported', fallbackUrl: email.unsubscribeLink },
        400
      );
    }

    let unsubUrl: URL;
    try {
      unsubUrl = new URL(email.unsubscribeLink);
    } catch {
      return c.json({ error: 'Invalid unsubscribe URL' }, 400);
    }
    if (unsubUrl.protocol !== 'https:') {
      return c.json({ error: 'Unsubscribe URL must be HTTPS' }, 400);
    }

    const res = await fetch(unsubUrl.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });

    if (!res.ok) {
      return c.json(
        {
          error: `Unsubscribe request failed (${res.status})`,
          fallbackUrl: email.unsubscribeLink,
        },
        502
      );
    }

    return c.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Unsubscribe error:', error?.message ?? err);
    return c.json({ error: 'Failed to unsubscribe' }, 500);
  }
});

function hasAuthCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie');
  if (!cookie) return false;
  return AUTH_COOKIE_FRAGMENTS.some((fragment) => cookie.includes(fragment));
}

function isSpaRoute(pathname: string): boolean {
  return SPA_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function fetchSpaShell(env: Env, request: Request): Promise<Response | null> {
  const origin = new URL(request.url).origin;
  const paths = ['/spa-index.html', '/spa-index'];

  for (const pathname of paths) {
    let response = await env.ASSETS.fetch(new Request(new URL(pathname, origin), request));

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        response = await env.ASSETS.fetch(new Request(new URL(location, origin), request));
      }
    }

    if (response.ok && response.body) return response;
  }

  return null;
}

async function serveSpaIndex(env: Env, request: Request): Promise<Response> {
  const response = await fetchSpaShell(env, request);
  if (!response?.body) {
    return response ?? new Response('SPA shell missing', { status: 500 });
  }

  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  // Always return 200 at the requested SPA path (/app, /about, …). The assets
  // binding redirects spa-index.html → /spa-index; forwarding that redirect
  // breaks React Router, which expects the browser URL to stay on /app.
  return new Response(response.body, { status: 200, headers });
}

async function serveLanding(request: Request, env: Env): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (!assetResponse.ok || !assetResponse.body) {
    return assetResponse;
  }

  const headers = new Headers(assetResponse.headers);
  headers.set('Cache-Control', LANDING_CACHE_CONTROL);
  headers.set('CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

  const acceptEncoding = request.headers.get('accept-encoding') ?? '';
  if (acceptEncoding.includes('gzip') && !headers.has('content-encoding')) {
    headers.set('content-encoding', 'gzip');
    headers.delete('content-length');
    const vary = headers.get('vary');
    headers.set('vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
    return new Response(assetResponse.body.pipeThrough(new CompressionStream('gzip')), {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  }

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

app.onError((err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err.message, err.stack);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default {
  fetch: withTiming(
    async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
      const url = new URL(request.url);

      if (url.pathname.startsWith('/api/')) {
        return app.fetch(request, env, ctx);
      }

      if (request.method === 'GET' && url.pathname === '/' && hasAuthCookie(request)) {
        return Response.redirect(`${url.origin}/app`, 302);
      }

      if (request.method === 'GET' && (url.pathname === '/spa-index' || url.pathname === '/spa-index.html')) {
        return Response.redirect(`${url.origin}/app`, 302);
      }

      if (request.method === 'GET' && isSpaRoute(url.pathname)) {
        return serveSpaIndex(env, request);
      }

      if (request.method === 'GET' && url.pathname === '/') {
        return serveLanding(request, env);
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404 && request.method === 'GET' && isSpaRoute(url.pathname)) {
        return serveSpaIndex(env, request);
      }

      return assetResponse.ok ? withSecurityHeaders(assetResponse) : assetResponse;
    }
  ),
};
