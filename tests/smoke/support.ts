export const PORT = Number(process.env.SMOKE_PORT ?? 3100);

/** Where the app under test is listening. */
export const BASE_URL = (process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, "");

type Init = Omit<RequestInit, "redirect"> & { cookie?: string; json?: unknown };

/** fetch() against the app; redirects are returned, not followed. */
export function request(path: string, { cookie, json, headers, ...init }: Init = {}) {
  const hasBody = !["GET", "HEAD"].includes((init.method ?? "GET").toUpperCase());
  return fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(json === undefined || !hasBody ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: !hasBody ? undefined : json === undefined ? init.body : JSON.stringify(json),
  });
}

export const locationOf = (response: Response) => {
  const location = response.headers.get("location");
  if (!location) return null;
  const url = new URL(location, BASE_URL);
  return url.pathname + url.search;
};

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * An access-token cookie as the API sets it, but signed with nothing. The site holds no
 * signing secret, so its proxy can only read the expiry; the API is what verifies.
 * @param expiresInSeconds Negative for a token that has already ended
 */
export const accessCookie = (expiresInSeconds = 900) =>
  `access_token=${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({ sub: "smoke-user", exp: Math.floor(Date.now() / 1000) + expiresInSeconds })}.not-a-real-signature`;

export const refreshCookie = () => "refresh_token=opaque-refresh-token-value-0123456789";
