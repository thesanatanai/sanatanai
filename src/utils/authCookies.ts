/**
 * Reads the session cookies the API sets, on the site's server and in its proxy.
 *
 * The site holds no signing secret, so nothing here proves a session is genuine.
 * It only tells whether one is *present*, to choose between the sign-in page and
 * the app. The API checks every real request.
 */

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/** Whether the payload of a JWT can be read and it still has more than `marginSeconds` to live. A signature is not checked. */
function isLiveAccessToken(token: string, now: number, marginSeconds = 0) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload: unknown = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const exp = payload && typeof payload === "object" ? (payload as { exp?: unknown }).exp : undefined;
    return typeof exp === "number" && exp * 1000 > now + marginSeconds * 1000;
  } catch {
    return false;
  }
}

/**
 * Whether the visitor looks signed in: a refresh cookie exists (the session can
 * be renewed), or the access cookie is a token that has not expired.
 * @param get Reads one cookie value, as `req.cookies.get(name)?.value` does
 */
export function hasSession(get: (name: string) => string | undefined, now = Date.now()) {
  if (get(REFRESH_COOKIE)) return true;
  const access = get(ACCESS_COOKIE);
  return !!access && isLiveAccessToken(access, now);
}

/**
 * Whether an access cookie is good for at least another `marginSeconds`.
 * The proxy renews a session whose access token is short of that before the page is rendered with it.
 */
export function isFreshAccessToken(token: string | undefined, marginSeconds = 30, now = Date.now()) {
  return !!token && isLiveAccessToken(token, now, marginSeconds);
}

export interface ParsedCookie {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

/**
 * Reads one `Set-Cookie` header the API sent, so the proxy can pass it on to the browser.
 * @returns undefined for something that is not a cookie
 */
export function parseSetCookie(header: string): ParsedCookie | undefined {
  const [pair, ...attributes] = header.split(";").map((part) => part.trim());
  const eq = pair.indexOf("=");
  if (eq < 1) return undefined;
  const cookie: ParsedCookie = { name: pair.slice(0, eq), value: pair.slice(eq + 1) };
  try {
    cookie.value = decodeURIComponent(cookie.value);
  } catch {
    // Keep it as it came.
  }
  for (const attribute of attributes) {
    const at = attribute.indexOf("=");
    const key = (at < 0 ? attribute : attribute.slice(0, at)).toLowerCase();
    const value = at < 0 ? "" : attribute.slice(at + 1);
    if (key === "max-age" && /^-?\d+$/.test(value)) cookie.maxAge = Number(value);
    else if (key === "expires" && !Number.isNaN(Date.parse(value))) cookie.expires = new Date(value);
    else if (key === "path") cookie.path = value;
    else if (key === "domain") cookie.domain = value;
    else if (key === "secure") cookie.secure = true;
    else if (key === "httponly") cookie.httpOnly = true;
    else if (key === "samesite" && ["lax", "strict", "none"].includes(value.toLowerCase())) {
      cookie.sameSite = value.toLowerCase() as ParsedCookie["sameSite"];
    }
  }
  return cookie;
}
