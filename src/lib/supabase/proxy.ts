import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  APP_SESSION_COOKIE,
  getAuthSessionIdentity,
  revokeAppSession,
  validateAppSession,
} from '@/lib/auth/session';

const PROTECTED = ['/sell', '/dashboard', '/messages', '/offers', '/saved', '/notifications', '/reviews', '/account', '/admin'];
const SESSION_EXEMPT = ['/api/auth/session', '/auth/callback', '/auth/signout'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const path = request.nextUrl.pathname;
  const needsLogin = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));
  const isApiRequest = path.startsWith('/api/');
  if (SESSION_EXEMPT.includes(path)) return response;
  const requiresAppSession = needsLogin || isApiRequest;

  let identity: Awaited<ReturnType<typeof getAuthSessionIdentity>>;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    identity = user ? await getAuthSessionIdentity(supabase) : null;
    if (identity && identity.userId !== user?.id) identity = null;
  } catch (error) {
    console.error('Could not validate the authenticated session:', error instanceof Error ? error.message : 'Unknown error');
    if (!needsLogin && !isApiRequest) return response;
    return isApiRequest
      ? NextResponse.json({ error: 'Session validation is temporarily unavailable.' }, { status: 503 })
      : new NextResponse('Session validation is temporarily unavailable. Please try again.', { status: 503 });
  }

  if (!identity && needsLogin) {
    response.cookies.delete(APP_SESSION_COOKIE);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?next=' + encodeURIComponent(path + request.nextUrl.search);
    return redirectWithCookies(response, url);
  }

  if (identity && requiresAppSession) {
    const cookieSessionId = request.cookies.get(APP_SESSION_COOKIE)?.value;
    let isValid = false;

    try {
      isValid = cookieSessionId === identity.sessionId
        && await validateAppSession(identity.sessionId, identity.userId);
    } catch (error) {
      console.error('Could not validate the application session:', error instanceof Error ? error.message : 'Unknown error');
      return isApiRequest
        ? NextResponse.json({ error: 'Session validation is temporarily unavailable.' }, { status: 503 })
        : new NextResponse('Session validation is temporarily unavailable. Please try again.', { status: 503 });
    }

    if (!isValid) {
      try {
        await revokeAppSession(identity.sessionId, identity.userId);
      } catch (error) {
        console.error('Could not revoke the invalid application session:', error instanceof Error ? error.message : 'Unknown error');
        return isApiRequest
          ? NextResponse.json({ error: 'Session termination is temporarily unavailable.' }, { status: 503 })
          : new NextResponse('Session termination is temporarily unavailable. Please try again.', { status: 503 });
      }

      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) console.error('Could not clear the expired local session:', error.message);
      response.cookies.delete(APP_SESSION_COOKIE);

      if (isApiRequest) {
        return copyResponseCookies(
          response,
          NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 }),
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?next=' + encodeURIComponent(path + request.nextUrl.search);
      return redirectWithCookies(response, url);
    }
  }

  return response;
}

function copyResponseCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

function redirectWithCookies(response: NextResponse, url: URL) {
  return copyResponseCookies(response, NextResponse.redirect(url));
}
