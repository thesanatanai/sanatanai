import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (secondsLeft: number) =>
  `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(Date.now() / 1000) + secondsLeft })}.sig`;
const live = `access_token=${token(600)}`;
const ended = `access_token=${token(-60)}`;
const refresh = "refresh_token=opaque-value";

const visit = (path: string, cookie?: string) =>
  proxy(new NextRequest(`https://site.test${path}`, { headers: cookie ? { cookie } : {} }));
const target = (response: Response) => {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
};

/** What the API sets when it renews or ends a session. */
const setCookies = (...lines: string[]) => {
  const headers = new Headers({ "content-type": "application/json" });
  for (const line of lines) headers.append("set-cookie", line);
  return headers;
};
const renewedHeaders = () =>
  setCookies(
    `access_token=${token(900)}; Max-Age=900; Path=/; HttpOnly; SameSite=Lax`,
    "refresh_token=next-refresh; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax",
  );
const clearedHeaders = () =>
  setCookies(
    "access_token=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
    "refresh_token=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
  );

let api: ReturnType<typeof vi.fn>;
beforeEach(() => {
  api = vi.fn();
  vi.stubGlobal("fetch", api);
});
afterEach(() => vi.unstubAllEnvs());

describe("proxy: who sees which page", () => {
  it("sends /app visitors without a session to sign-in", async () => {
    const res = await visit("/app");
    expect(res.status).toBe(307);
    expect(target(res)).toBe("/welcome?logout=true");
    expect(target(await visit("/app/anything", "access_token=garbage"))).toBe("/welcome?logout=true");
    expect(target(await visit("/app", ended))).toBe("/welcome?logout=true");
    expect(api).not.toHaveBeenCalled();
  });

  it.each(["/", "/hi", "/welcome"])("sends a signed-in visitor from %s to the app", async (path) => {
    expect(target(await visit(path, refresh))).toBe("/app");
    expect(target(await visit(path, live))).toBe("/app");
  });

  it.each(["/", "/hi", "/welcome"])("shows %s to a visitor with no session", async (path) => {
    expect(target(await visit(path))).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it("shows the sign-in page for ?logout=true even with cookies, so they can be ended", async () => {
    expect(target(await visit("/welcome?logout=true", refresh))).toBeNull();
    expect(target(await visit("/welcome?logout=false", refresh))).toBe("/app");
  });

  it("only runs on the pages it decides for", () => {
    expect(config.matcher).toEqual(["/", "/hi", "/app/:path*", "/welcome"]);
  });
});

describe("proxy: keeping the chat page's session fresh", () => {
  it("leaves a request alone when the access token is good for a while", async () => {
    const res = await visit("/app", `${live}; ${refresh}`);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it.each([
    ["has ended", `${ended}; ${refresh}`],
    ["is gone (the browser dropped the expired cookie)", refresh],
    ["is about to end", `access_token=${token(10)}; ${refresh}`],
  ])("renews the session when the access token %s", async (_name, cookie) => {
    api.mockResolvedValue(new Response("{}", { status: 200, headers: renewedHeaders() }));

    const res = await visit("/app", cookie);

    expect(api).toHaveBeenCalledTimes(1);
    const [url, init] = api.mock.calls[0];
    expect(url).toBe("http://localhost:8080/v1/auth/refresh");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ cookie: "refresh_token=opaque-value" }); // the refresh cookie only, no body
    expect(init.body).toBeUndefined();

    // The browser gets the new cookies, as the API set them.
    const set = res.headers.getSetCookie();
    expect(set).toHaveLength(2);
    expect(set.find((c) => c.startsWith("access_token="))).toMatch(/Max-Age=900.*HttpOnly/i);
    expect(set.find((c) => c.startsWith("refresh_token=next-refresh"))).toMatch(/Max-Age=2592000/);
    expect(res.status).toBe(200);
  });

  it("gives the page, which is rendered in this same request, the new cookies", async () => {
    const headers = renewedHeaders();
    api.mockResolvedValue(new Response("{}", { status: 200, headers }));
    const res = await visit("/app", `${ended}; ${refresh}; theme=dark`);
    const forwarded = res.headers.get("x-middleware-request-cookie") ?? "";
    expect(forwarded).toContain("refresh_token=next-refresh");
    expect(forwarded).toMatch(/access_token=[\w-]+\.[\w-]+\.sig/);
    expect(forwarded).not.toContain(ended.slice("access_token=".length));
    expect(forwarded).toContain("theme=dark");
  });

  it("uses the server's own address for the API when there is one", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:8080/");
    api.mockResolvedValue(new Response("{}", { status: 200, headers: renewedHeaders() }));
    await visit("/app", refresh);
    expect(api.mock.calls[0][0]).toBe("http://api.internal:8080/v1/auth/refresh");
  });

  it("sends the visitor to sign-in, and clears their cookies, when the API ends the session", async () => {
    api.mockResolvedValue(
      new Response(JSON.stringify({ error: "Please sign in again.", code: "refresh_reused" }), {
        status: 401,
        headers: clearedHeaders(),
      }),
    );
    const res = await visit("/app", `${ended}; ${refresh}`);
    expect(target(res)).toBe("/welcome?logout=true");
    const set = res.headers.getSetCookie();
    expect(set).toHaveLength(2);
    expect(set.every((c) => /Max-Age=0/i.test(c))).toBe(true);
  });

  it("lets the page open, with nothing changed, after a lost race: the browser's own renewal is the newer one", async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ code: "refresh_race" }), { status: 401 }));
    const res = await visit("/app", refresh);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it.each([
    ["an error from the API", () => new Response("{}", { status: 503 })],
    ["a rate limit", () => new Response(JSON.stringify({ code: "rate_limited" }), { status: 429 })],
    ["a 401 that is not the API's (a gateway, say)", () => new Response("<html>", { status: 401 })],
  ])("lets the page open, and keeps the cookies, on %s", async (_name, reply) => {
    api.mockResolvedValue(reply());
    const res = await visit("/app", refresh);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("ends the session for each of the API's two refusals", async () => {
    for (const code of ["invalid_refresh_token", "refresh_reused"]) {
      api.mockResolvedValue(new Response(JSON.stringify({ code }), { status: 401, headers: clearedHeaders() }));
      expect(target(await visit("/app", refresh))).toBe("/welcome?logout=true");
    }
  });

  it("lets the page open when the API cannot be reached, so the browser can try", async () => {
    api.mockRejectedValue(new TypeError("fetch failed"));
    const res = await visit("/app", refresh);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("gives up on a slow API after a few seconds, so the page is not held back for ever", async () => {
    api.mockResolvedValue(new Response("{}", { status: 200, headers: renewedHeaders() }));
    await visit("/app", refresh);
    const { signal } = api.mock.calls[0][1] as RequestInit;
    expect(signal).toBeInstanceOf(AbortSignal);
    api.mockRejectedValue(new DOMException("The operation timed out", "TimeoutError"));
    const res = await visit("/app", refresh);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
