import jwt from "jsonwebtoken";

export const PORT = Number(process.env.SMOKE_PORT ?? 3100);

/** Where the app under test is listening. */
export const BASE_URL = (process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, "");

/**
 * Secret the server signs sessions with. When this suite starts the server
 * itself it is known; against an external server, pass SMOKE_JWT_SECRET to
 * enable the tests that need a valid session cookie (they are skipped otherwise).
 */
export const JWT_SECRET = process.env.SMOKE_JWT_SECRET ?? (process.env.SMOKE_BASE_URL ? undefined : "smoke-test-secret-smoke-test-secret");

export const sessionCookie = (options: jwt.SignOptions = {}, secret = JWT_SECRET!) =>
  `token=${jwt.sign({ id: "smoke-user" }, secret, options)}`;

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
