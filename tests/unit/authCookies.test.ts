import { describe, expect, it } from "vitest";
import { hasSession, isFreshAccessToken, parseSetCookie } from "@/utils/authCookies";

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (payload: unknown) => `${b64({ alg: "HS256" })}.${b64(payload)}.signature`;
const NOW = 1_800_000_000_000;
const cookies = (jar: Record<string, string>) => (name: string) => jar[name];

describe("hasSession", () => {
  it("is false with no cookies", () => {
    expect(hasSession(cookies({}), NOW)).toBe(false);
  });

  it("is true with a refresh cookie, whatever else there is: it can renew the session", () => {
    expect(hasSession(cookies({ refresh_token: "x" }), NOW)).toBe(true);
    expect(hasSession(cookies({ refresh_token: "x", access_token: "garbage" }), NOW)).toBe(true);
  });

  it("is true with an access token that has not ended", () => {
    expect(hasSession(cookies({ access_token: jwt({ exp: NOW / 1000 + 60 }) }), NOW)).toBe(true);
  });

  it("is false with an access token that has ended", () => {
    expect(hasSession(cookies({ access_token: jwt({ exp: NOW / 1000 - 1 }) }), NOW)).toBe(false);
    expect(hasSession(cookies({ access_token: jwt({ exp: NOW / 1000 }) }), NOW)).toBe(false);
  });

  it.each([
    ["no expiry", jwt({ sub: "u" })],
    ["a text expiry", jwt({ exp: "soon" })],
    ["a payload that is not an object", jwt(5)],
    ["a payload that is not JSON", `a.${Buffer.from("{nope").toString("base64url")}.c`],
    ["too few parts", "only.two"],
    ["not base64", "a.!!!.c"],
    ["an empty value", ""],
  ])("is false for an access cookie with %s", (_name, value) => {
    expect(hasSession(cookies({ access_token: value }), NOW)).toBe(false);
  });

  it("does not look at the signature: the API does that", () => {
    expect(hasSession(cookies({ access_token: `${b64({})}.${b64({ exp: NOW / 1000 + 60 })}.forged` }), NOW)).toBe(true);
  });

  it("ignores the cookie of the previous backend", () => {
    expect(hasSession(cookies({ token: jwt({ exp: NOW / 1000 + 60 }) }), NOW)).toBe(false);
  });

  it("uses the clock when none is given", () => {
    expect(hasSession(cookies({ access_token: jwt({ exp: Date.now() / 1000 + 60 }) }))).toBe(true);
    expect(hasSession(cookies({ access_token: jwt({ exp: Date.now() / 1000 - 60 }) }))).toBe(false);
  });
});

describe("isFreshAccessToken", () => {
  it("needs a token with more than the margin left", () => {
    const at = (seconds: number) => jwt({ exp: NOW / 1000 + seconds });
    expect(isFreshAccessToken(at(120), 30, NOW)).toBe(true);
    expect(isFreshAccessToken(at(31), 30, NOW)).toBe(true);
    expect(isFreshAccessToken(at(30), 30, NOW)).toBe(false);
    expect(isFreshAccessToken(at(-5), 30, NOW)).toBe(false);
  });
  it("is false for no token or one that cannot be read", () => {
    expect(isFreshAccessToken(undefined)).toBe(false);
    expect(isFreshAccessToken("")).toBe(false);
    expect(isFreshAccessToken("garbage")).toBe(false);
  });
});

describe("parseSetCookie", () => {
  it("reads the name, value and every attribute the API sets", () => {
    expect(
      parseSetCookie("access_token=abc.def.ghi; Max-Age=900; Domain=example.com; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly; Secure; SameSite=Lax"),
    ).toEqual({
      name: "access_token",
      value: "abc.def.ghi",
      maxAge: 900,
      domain: "example.com",
      path: "/",
      expires: new Date("Wed, 21 Oct 2026 07:28:00 GMT"),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });

  it("reads a cookie that clears another", () => {
    expect(parseSetCookie("refresh_token=; Max-Age=0; Path=/; HttpOnly")).toMatchObject({ name: "refresh_token", value: "", maxAge: 0 });
  });

  it("decodes a value that was percent-encoded, and keeps one that cannot be decoded", () => {
    expect(parseSetCookie("a=b%20c")?.value).toBe("b c");
    expect(parseSetCookie("a=%E0%A4%A")?.value).toBe("%E0%A4%A");
  });

  it("knows the other SameSite values and ignores what it does not know", () => {
    expect(parseSetCookie("a=b; SameSite=None")?.sameSite).toBe("none");
    expect(parseSetCookie("a=b; SameSite=Strict")?.sameSite).toBe("strict");
    expect(parseSetCookie("a=b; SameSite=weird; Max-Age=soon; Expires=never; Priority=High")).toEqual({ name: "a", value: "b" });
  });

  it("returns nothing for something that is not a cookie", () => {
    expect(parseSetCookie("")).toBeUndefined();
    expect(parseSetCookie("novalue")).toBeUndefined();
    expect(parseSetCookie("=x")).toBeUndefined();
  });
});
