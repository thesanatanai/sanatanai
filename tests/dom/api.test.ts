import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiFetch,
  getProfile,
  listChats,
  patchChat,
  requestOtp,
  signOut,
  streamReply,
  verifyOtp,
} from "@/utils/api";
import { useAuthStore } from "@/stores/authStore";
import { API, fakeApi, json, sseResponse } from "../helpers/api";

// The refresh token is in an HttpOnly cookie the page cannot see, so answers never hold it.
// The access token is in the answer: the page keeps it in memory.
const user = { id: "u1", name: "S", email: "s@example.com", picture: "", preferredLocale: "en", memories: [] };
const authResult = (n = 2) => ({ accessToken: `access-${n}`, expiresIn: 900, user });
const token = () => useAuthStore.getState().accessToken;
const signedIn = (value = "access-1") => useAuthStore.getState().setAccessToken(value);
const unauthorized = (code = "invalid_token") => json({ error: "No", code }, { status: 401 });

/** A fake API whose protected routes answer 401 until the session has been renewed. */
function sessionApi(extra: Record<string, unknown> = {}, refresh: () => Response | Promise<Response> = () => json(authResult())) {
  let renewed = false;
  const protectedRoute = (ok: () => Response) => () => (renewed ? ok() : unauthorized());
  return fakeApi({
    "GET /v1/me": protectedRoute(() => json(user)),
    "GET /v1/chats": protectedRoute(() => json([])),
    "POST /v1/auth/refresh": async () => {
      const response = await refresh();
      if (response.ok) renewed = true;
      return response;
    },
    ...extra,
  });
}

let replace: ReturnType<typeof vi.fn>;
beforeEach(() => {
  replace = vi.fn();
  vi.stubGlobal("location", { pathname: "/app", replace });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("calling the API", () => {
  it("sends the access token from memory as a bearer token, without cookies, and JSON as JSON", async () => {
    signedIn();
    const { calls } = fakeApi({ "PATCH /v1/chats/c1": () => new Response(null, { status: 204 }) });
    await patchChat("c1", { title: "T" });
    expect(calls).toMatchObject([
      { method: "PATCH", path: "/v1/chats/c1", credentials: "omit", body: { title: "T" } },
    ]);
    expect(calls[0].headers.authorization).toBe("Bearer access-1");
    expect(calls[0].headers["content-type"]).toBe("application/json");
  });

  it("sends no token when the page has none yet, and gets one by renewing", async () => {
    const { calls } = sessionApi();
    await listChats();
    expect(calls[0].headers.authorization).toBeUndefined();
    expect(calls.map((c) => c.path)).toEqual(["/v1/chats", "/v1/auth/refresh", "/v1/chats"]);
    expect(calls[2].headers.authorization).toBe("Bearer access-2");
  });

  it("stores nothing in the browser: the token is only in memory", async () => {
    signedIn();
    sessionApi();
    await listChats(); // renews, so a second token is received as well
    await verifyOtp("s@example.com", "123456", "en").catch(() => {});
    expect(token()).toBe("access-2");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });

  it("returns nothing for 204 and the parsed body otherwise", async () => {
    fakeApi({ "GET /v1/chats": [{ id: "a" }], "PATCH /v1/chats/c1": () => new Response(null, { status: 204 }) });
    expect(await listChats()).toEqual([{ id: "a" }]);
    expect(await patchChat("c1", { title: "T" })).toBeUndefined();
  });

  it("turns an error response into an ApiError with the API's message, code and extras", async () => {
    fakeApi({ "GET /v1/chats": () => json({ error: "Slow down", code: "rate_limited", newIn: 30 }, { status: 429 }) });
    const error = await listChats().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: "Slow down", code: "rate_limited", body: { newIn: 30 } });
  });

  it("still makes an ApiError when the error body is not JSON", async () => {
    fakeApi({ "GET /v1/chats": () => new Response("<html>bad gateway</html>", { status: 502 }) });
    await expect(listChats()).rejects.toMatchObject({ status: 502, message: "Request failed (502)" });
  });
});

describe("renewing the session", () => {
  it("renews with no body, using the refresh cookie, when the API refuses the token; keeps the new token; repeats the call", async () => {
    signedIn("old-token");
    const { calls } = sessionApi();
    expect(await getProfile()).toMatchObject({ id: "u1" });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["GET /v1/me", "POST /v1/auth/refresh", "GET /v1/me"]);
    expect(calls[0].headers.authorization).toBe("Bearer old-token");
    const renewal = calls[1];
    expect(renewal.body).toBeUndefined();
    expect(renewal.credentials).toBe("include");
    expect(renewal.headers["content-type"]).toBeUndefined();
    expect(renewal.headers.authorization).toBeUndefined(); // it is the cookie that proves the session
    expect(token()).toBe("access-2");
    expect(calls[2].headers.authorization).toBe("Bearer access-2");
  });

  it("does not renew on its own: a call that works is the only call", async () => {
    const { calls } = fakeApi({ "GET /v1/me": user });
    await getProfile();
    expect(calls).toHaveLength(1);
  });

  it("gives up after one repeat: a second refusal is the answer", async () => {
    const { calls } = fakeApi({ "GET /v1/me": () => unauthorized(), "POST /v1/auth/refresh": authResult() });
    await expect(getProfile()).rejects.toMatchObject({ status: 401 });
    expect(calls.filter((c) => c.path === "/v1/me")).toHaveLength(2);
    expect(calls.filter((c) => c.path === "/v1/auth/refresh")).toHaveLength(1);
  });

  it("renews only once when many calls need it at the same time", async () => {
    const { calls } = sessionApi({}, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return json(authResult());
    });
    await Promise.all([getProfile(), listChats(), getProfile()]);
    expect(calls.filter((c) => c.path === "/v1/auth/refresh")).toHaveLength(1);
    expect(calls.filter((c) => c.path === "/v1/me")).toHaveLength(4);
  });

  it("can renew again after a renewal has finished", async () => {
    let n = 0;
    const { calls } = fakeApi({
      "GET /v1/me": () => (n % 2 === 0 ? unauthorized() : json(user)),
      "POST /v1/auth/refresh": () => (n++, json(authResult())),
    });
    await getProfile();
    n = 2; // the new access token has ended again
    await getProfile();
    expect(calls.filter((c) => c.path === "/v1/auth/refresh")).toHaveLength(2);
  });

  it("renews again with the newer cookie after losing a race (the server or another tab renewed first)", async () => {
    let renewals = 0;
    const { calls } = fakeApi({
      "GET /v1/me": () => (token() === "access-2" ? json(user) : unauthorized()),
      "POST /v1/auth/refresh": () => (renewals++ === 0 ? unauthorized("refresh_race") : json(authResult())),
    });
    expect(await getProfile()).toMatchObject({ id: "u1" });
    expect(calls.map((c) => c.path)).toEqual(["/v1/me", "/v1/auth/refresh", "/v1/auth/refresh", "/v1/me"]);
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the session, and fails the call, when the race is lost twice", async () => {
    signedIn();
    sessionApi({}, () => unauthorized("refresh_race"));
    await expect(getProfile()).rejects.toMatchObject({ code: "refresh_race" });
    expect(replace).not.toHaveBeenCalled();
    expect(token()).toBe("access-1");
  });

  it.each(["invalid_refresh_token", "refresh_reused"])("forgets the token and sends the user to sign-in when the API answers %s", async (code) => {
    signedIn();
    sessionApi({}, () => unauthorized(code));
    await expect(getProfile()).rejects.toMatchObject({ status: 401, code });
    expect(replace).toHaveBeenCalledWith("/welcome?logout=true");
    expect(token()).toBeNull();
  });

  it("keeps the session when the server is failing, so a bad minute does not sign anyone out", async () => {
    sessionApi({}, () => json({ error: "Down", code: "internal" }, { status: 500 }));
    await expect(getProfile()).rejects.toMatchObject({ status: 500 });
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the session when the renewal is rate limited", async () => {
    sessionApi({}, () => json({ error: "Slow", code: "rate_limited" }, { status: 429 }));
    await expect(getProfile()).rejects.toMatchObject({ status: 429 });
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the session when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(getProfile()).rejects.toBeInstanceOf(TypeError);
    expect(replace).not.toHaveBeenCalled();
  });

  describe("with several tabs open", () => {
    afterEach(() => Reflect.deleteProperty(navigator, "locks"));

    it("takes a lock, so two tabs cannot spend the same refresh token", async () => {
      const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback());
      Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
      sessionApi();
      await getProfile();
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0]).toBe("sanatan-refresh");
    });
  });
});

describe("signing in", () => {
  it("sends the code with cookies on, to receive the session's cookies, and answers the user", async () => {
    const { calls } = fakeApi({ "POST /v1/auth/otp/verify": authResult(1) });
    const result = await verifyOtp("s@example.com", "123456", "hi");
    expect(result).toMatchObject({ id: "u1" });
    expect(calls).toMatchObject([
      { path: "/v1/auth/otp/verify", credentials: "include", body: { email: "s@example.com", otp: "123456", locale: "hi" } },
    ]);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${API}/v1/auth/otp/verify`);
  });

  it("returns the wait before another code may be asked for", async () => {
    fakeApi({ "POST /v1/auth/otp/request": { message: "Done", newIn: 120 } });
    expect(await requestOtp("s@example.com")).toBe(120);
  });

  it("does not try to renew a sign-in that was refused", async () => {
    const { calls } = fakeApi({ "POST /v1/auth/otp/verify": () => json({ error: "OTP Invalid", code: "otp_invalid" }, { status: 401 }) });
    await expect(verifyOtp("s@example.com", "000000", "en")).rejects.toMatchObject({ code: "otp_invalid" });
    expect(calls).toHaveLength(1);
  });
});

describe("signing out", () => {
  it("forgets the token and asks the server to end the session and clear the cookies, with no body", async () => {
    signedIn();
    const { calls } = fakeApi({ "POST /v1/auth/logout": () => new Response(null, { status: 204 }) });
    await signOut();
    expect(calls).toMatchObject([{ path: "/v1/auth/logout", credentials: "include", body: undefined }]);
    expect(token()).toBeNull();
  });

  it("forgets the token even when the server cannot be reached", async () => {
    signedIn();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(signOut()).resolves.toBeUndefined();
    expect(token()).toBeNull();
  });
});

describe("streaming a reply", () => {
  const message = { parts: [{ text: "hello" }] };
  const collect = async (stream: AsyncGenerator<unknown>) => {
    const events: unknown[] = [];
    for await (const event of stream) events.push(event);
    return events;
  };

  it("posts the message and the thinking level with the bearer token, and yields the events", async () => {
    signedIn();
    const { calls } = fakeApi({
      "POST /v1/chats/c%201/messages": () =>
        sseResponse([{ type: "text", text: "Om" }, { type: "done" }], { comments: true }),
    });
    const controller = new AbortController();

    const events = await collect(streamReply("c 1", message, "high", controller.signal));

    expect(events).toEqual([{ type: "text", text: "Om" }, { type: "done" }]);
    expect(calls).toMatchObject([
      { credentials: "omit", body: { message: { parts: [{ text: "hello" }] }, thinking: "high" }, signal: controller.signal },
    ]);
    expect(calls[0].headers.authorization).toBe("Bearer access-1");
    expect(calls[0].headers.accept).toBe("text/event-stream");
  });

  it("sends only the message's parts, not the view's own fields", async () => {
    const { calls } = fakeApi({ "POST /v1/chats/c1/messages": () => sseResponse([{ type: "done" }]) });
    await collect(
      streamReply("c1", { role: "user", index: 3, streaming: false, parts: [{ text: "hi" }] } as never, "medium"),
    );
    expect(calls[0].body).toEqual({ message: { parts: [{ text: "hi" }] }, thinking: "medium" });
  });

  it("ignores events without a type", async () => {
    fakeApi({ "POST /v1/chats/c1/messages": () => sseResponse([{ hello: 1 }, "text", null, { type: "done" }]) });
    expect(await collect(streamReply("c1", message, "medium"))).toEqual([{ type: "done" }]);
  });

  it("fails with the API's error when the reply cannot start", async () => {
    fakeApi({ "POST /v1/chats/c1/messages": () => json({ error: "Chat not found", code: "not_found" }, { status: 404 }) });
    await expect(collect(streamReply("c1", message, "medium"))).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("renews the session and starts again when the token ended before the reply began", async () => {
    let renewed = false;
    const { calls } = fakeApi({
      "POST /v1/chats/c1/messages": () => (renewed ? sseResponse([{ type: "done" }]) : unauthorized()),
      "POST /v1/auth/refresh": () => ((renewed = true), json(authResult())),
    });
    expect(await collect(streamReply("c1", message, "medium"))).toEqual([{ type: "done" }]);
    expect(calls.map((c) => c.path)).toEqual(["/v1/chats/c1/messages", "/v1/auth/refresh", "/v1/chats/c1/messages"]);
  });
});

describe("apiFetch", () => {
  it("gives the raw response, also for error statuses other than 401", async () => {
    fakeApi({ "GET /v1/chats": () => json({ error: "x" }, { status: 429 }) });
    const response = await apiFetch("/v1/chats");
    expect(response.status).toBe(429);
  });
});
