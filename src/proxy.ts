import { NextRequest, NextResponse } from "next/server";
import { serverApiUrl } from "@/utils/apiUrl";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  hasSession,
  isFreshAccessToken,
  parseSetCookie,
  type ParsedCookie,
} from "@/utils/authCookies";

/** The API must answer a renewal within this long, or the page is rendered without a session and the browser renews it itself. */
const RENEW_TIMEOUT_MS = 4000;

type Renewal =
  | { kind: "renewed"; cookies: ParsedCookie[] }
  /** The API refused: the session is over, and it sent cookies that clear it. */
  | { kind: "over"; cookies: ParsedCookie[] }
  /** Could not tell (API down, slow, or a lost race): the browser can try for itself. */
  | { kind: "unknown" };

/** Renews the session with the refresh cookie, as the browser would, and collects the cookies the API sets. */
async function renew(refreshToken: string): Promise<Renewal> {
  try {
    const response = await fetch(`${serverApiUrl()}/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(RENEW_TIMEOUT_MS),
    });
    const cookies = response.headers
      .getSetCookie()
      .map(parseSetCookie)
      .filter((cookie): cookie is ParsedCookie => !!cookie);
    if (response.ok) return { kind: "renewed", cookies };
    // Only the API's own word ends a session. A lost race (the browser or another request
    // renewed first), a gateway's 401 or an outage do not.
    const code = (await response.json().catch(() => ({})))?.code;
    return response.status === 401 && (code === "invalid_refresh_token" || code === "refresh_reused")
      ? { kind: "over", cookies }
      : { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
  }
}

function setCookies(response: NextResponse, cookies: ParsedCookie[]) {
  for (const { name, value, ...options } of cookies) response.cookies.set({ name, value, ...options });
}

/**
 * Sends visitors to the right place using the session cookies the API sets, and keeps the
 * session fresh for the chat page: the server renders it with the access token from the cookie,
 * so a token that has ended is renewed here first, and the new cookies go to the browser and to the page.
 *
 * The cookies are only looked at, never trusted: the API enforces every real request.
 */
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const get = (name: string) => req.cookies.get(name)?.value;
  const signedIn = hasSession(get);

  if (pathname.startsWith("/app")) {
    if (!signedIn) return NextResponse.redirect(new URL("/welcome?logout=true", req.url));

    const refreshToken = get(REFRESH_COOKIE);
    if (refreshToken && !isFreshAccessToken(get(ACCESS_COOKIE))) {
      const renewal = await renew(refreshToken);
      if (renewal.kind === "over") {
        const response = NextResponse.redirect(new URL("/welcome?logout=true", req.url));
        setCookies(response, renewal.cookies);
        return response;
      }
      if (renewal.kind === "renewed") {
        // The page is rendered during this same request, so it must see the new cookies too.
        const headers = new Headers(req.headers);
        const jar = new Map(req.cookies.getAll().map(({ name, value }) => [name, value]));
        for (const { name, value } of renewal.cookies) jar.set(name, value);
        headers.set("cookie", [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; "));
        const response = NextResponse.next({ request: { headers } });
        setCookies(response, renewal.cookies);
        return response;
      }
    }
    return NextResponse.next();
  }

  // `?logout=true` is how the sign-in page is reached with leftover cookies; it also ends that session.
  const showcase = pathname === "/" || pathname === "/hi" || pathname === "/welcome";
  if (showcase && signedIn && searchParams.get("logout") !== "true") {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/hi", "/app/:path*", "/welcome"] };
