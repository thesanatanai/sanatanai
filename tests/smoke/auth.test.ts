import { describe, expect, it } from "vitest";
import { accessCookie, locationOf, refreshCookie, request } from "./support";

// The API sets the session in HttpOnly cookies (access_token, refresh_token) that the
// site's server can read. The proxy only looks at them to choose between the sign-in page
// and the app: it holds no secret, so the API is what enforces the session.
describe("the chat page", () => {
  it("sends a visitor with no session to the sign-in page", async () => {
    const res = await request("/app");
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/welcome?logout=true");
  });

  it("sends a visitor with only unusable cookies to the sign-in page", async () => {
    for (const cookie of ["access_token=garbage", accessCookie(-60), "token=old-cookie-of-the-previous-backend"]) {
      const res = await request("/app", { cookie });
      expect(locationOf(res), cookie).toBe("/welcome?logout=true");
    }
  });

  it("opens for a visitor whose refresh cookie is present, even when the access token has ended", async () => {
    const res = await request("/app", { cookie: `${accessCookie(-60)}; ${refreshCookie()}` });
    expect(res.status).toBe(200);
  });

  it("opens for a visitor with a live access token and no refresh cookie", async () => {
    expect((await request("/app", { cookie: accessCookie() })).status).toBe(200);
  });

  it("opens for a visitor with only the refresh cookie (the access cookie ended and was dropped)", async () => {
    expect((await request("/app", { cookie: refreshCookie() })).status).toBe(200);
  });

  it("is a static shell: the page itself holds no chat or user data", async () => {
    const html = await (await request("/app", { cookie: refreshCookie() })).text();
    expect(html).not.toMatch(/chatId|preferredLocale/);
  });
});

describe("the showcase and sign-in pages", () => {
  it.each(["/", "/hi", "/welcome"])("serve %s to a visitor with no session", async (path) => {
    expect((await request(path)).status).toBe(200);
  });

  it.each(["/", "/hi", "/welcome"])("send a signed-in visitor from %s to the app", async (path) => {
    for (const cookie of [refreshCookie(), accessCookie()]) {
      const res = await request(path, { cookie });
      expect(res.status).toBe(307);
      expect(locationOf(res)).toBe("/app");
    }
  });

  it("keeps showing the sign-in page for ?logout=true, which is how leftover cookies are ended", async () => {
    const res = await request("/welcome?logout=true", { cookie: refreshCookie() });
    expect(res.status).toBe(200);
  });

  it("serves /welcome to a visitor whose only cookie has ended", async () => {
    expect((await request("/welcome", { cookie: accessCookie(-60) })).status).toBe(200);
  });
});
