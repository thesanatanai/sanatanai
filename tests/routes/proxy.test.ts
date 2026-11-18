import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const secret = process.env.JWT_SECRET!;
const sign = (key = secret, options: jwt.SignOptions = {}) => jwt.sign({ id: "user-1" }, key, options);

const request = (path: string, token?: string) =>
  new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: token ? { cookie: `token=${token}` } : {},
  });

const redirectTarget = (res: Response) => {
  const location = res.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
};
const passesThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

describe("proxy: protecting /app", () => {
  it.each([
    ["no cookie", undefined],
    ["a malformed token", "not-a-token"],
    ["a token signed with another secret", sign("another-secret")],
    ["an expired token", sign(secret, { expiresIn: -60 })],
  ])("sends visitors with %s to the sign-in page", async (_label, token) => {
    const res = await proxy(request("/app", token));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/welcome?logout=true");
  });

  it("also clears the bad session cookie", async () => {
    const res = await proxy(request("/app", "not-a-token"));
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^token=;/);
    expect(cookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("protects everything below /app too", async () => {
    const res = await proxy(request("/app/settings"));
    expect(redirectTarget(res)).toBe("/welcome?logout=true");
  });

  it("lets a valid session through", async () => {
    const res = await proxy(request("/app", sign()));
    expect(passesThrough(res)).toBe(true);
  });
});

describe("proxy: signed-in visitors skip the marketing and sign-in pages", () => {
  it.each(["/", "/hi", "/welcome"])("sends a signed-in user from %s to /app", async (path) => {
    const res = await proxy(request(path, sign()));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/app");
  });

  it.each(["/", "/hi", "/welcome"])("shows %s to visitors who are not signed in", async (path) => {
    expect(passesThrough(await proxy(request(path)))).toBe(true);
    expect(passesThrough(await proxy(request(path, "garbage")))).toBe(true);
  });

  it("keeps the logout page reachable for a signed-in user", async () => {
    // Otherwise "log out" would bounce straight back into the app.
    const res = await proxy(request("/welcome?logout=true", sign()));
    expect(passesThrough(res)).toBe(true);
  });
});

describe("proxy matcher", () => {
  it("only runs for the pages it guards, never for API routes or static files", () => {
    expect(config.matcher).toEqual(["/", "/hi", "/app/:path*", "/welcome"]);
  });
});
