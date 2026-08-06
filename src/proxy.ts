import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Proxy - the first, cheap gate for the admin console and the agent
 * field app. A visitor with
 * no sign of a session is redirected to /login before the admin bundle is
 * ever sent.
 *
 * Two cookies count as "sign of a session":
 *  - `refreshToken` - the real httpOnly session cookie, visible here only when
 *    the API shares this site's domain (local dev, same-domain deploys).
 *  - `dbplus.auth.hint` - a first-party presence hint the client sets on login
 *    and clears on logout, for production where the API lives on another
 *    origin and its cookies never reach this proxy.
 *
 * The gate is deliberately one-directional and presence-only. A *present*
 * cookie is NOT proof of a live session (it can be stale - e.g. a reset DB),
 * so we must NOT also redirect cookie-bearing visitors away from /login: that
 * would fight `RequireAuth`, which does the real `GET /auth/me` validation
 * and, on failure, clears the cookie and returns to /login. Bouncing both
 * ways on cookie presence loops. So /login is left alone here and RequireAuth
 * is the authority.
 */
const SESSION_COOKIE = "refreshToken";
const HINT_COOKIE = "dbplus.auth.hint";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSessionSign =
    request.cookies.has(SESSION_COOKIE) || request.cookies.has(HINT_COOKIE);

  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/agent")) &&
    !hasSessionSign
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
};
