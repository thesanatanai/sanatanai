import { describe, expect, it } from "vitest";
import { JWT_SECRET, locationOf, request, sessionCookie } from "./support";

describe("the signed-in app is protected", () => {
  it.each(["/app", "/app/anything"])("sends visitors without a session from %s to sign-in", async (path) => {
    const res = await request(path);
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/welcome?logout=true");
  });

  it("clears a bad session cookie while redirecting", async () => {
    const res = await request("/app", { cookie: "token=garbage" });
    expect(locationOf(res)).toBe("/welcome?logout=true");
    expect(res.headers.get("set-cookie")).toMatch(/^token=;/);
  });

  it("does not trust a token signed with another secret", async () => {
    const res = await request("/app", { cookie: sessionCookie({}, "not-the-server-secret-at-all-12345") });
    expect(locationOf(res)).toBe("/welcome?logout=true");
  });

  it("does not trust an expired token", async () => {
    const res = await request("/app", { cookie: sessionCookie({ expiresIn: -60 }, JWT_SECRET ?? "x") });
    expect(res.status).toBe(307);
  });
});

// These need a token the server accepts, so they need to know its secret.
describe.skipIf(!JWT_SECRET)("signed-in visitors", () => {
  it.each(["/", "/hi", "/welcome"])("skip the sign-in and landing page %s", async (path) => {
    const res = await request(path, { cookie: sessionCookie() });
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/app");
  });

  it("can still reach the logout page", async () => {
    const res = await request("/welcome?logout=true", { cookie: sessionCookie() });
    expect(res.status).toBe(200);
  });

  it("see public pages that the proxy does not touch, such as /terms", async () => {
    const res = await request("/terms", { cookie: sessionCookie() });
    expect(res.status).toBe(200);
  });
});
