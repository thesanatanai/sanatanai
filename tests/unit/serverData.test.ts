import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionExpired, loadAppData } from "@/utils/serverData";

const user = { id: "u1", name: "S", email: "s@example.com", picture: "", preferredLocale: "en", memories: [] };
const chat = (id: string, timestamp: number) => ({ id, title: id, timestamp });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let api: ReturnType<typeof vi.fn>;
let routes: Record<string, () => Response>;
beforeEach(() => {
  routes = {
    "/v1/me": () => json(user),
    "/v1/chats": () => json([chat("old", 1), chat("new", 9)]),
    "/v1/chats/new": () => json({ id: "new", title: "new", timestamp: 9, messages: [{ role: "user", parts: [{ text: "hi" }] }] }),
  };
  api = vi.fn(async (url: string) => {
    const path = url.replace("http://localhost:8080", "");
    const route = routes[path];
    if (!route) throw new Error(`unexpected ${path}`);
    return route();
  });
  vi.stubGlobal("fetch", api);
});
afterEach(() => vi.unstubAllEnvs());

describe("loadAppData", () => {
  it("loads the user, the chats and the most recent chat with the access token", async () => {
    const data = await loadAppData("the-token");
    expect(data).toEqual({
      user,
      chats: [chat("old", 1), chat("new", 9)],
      chatId: "new",
      messages: [{ role: "user", parts: [{ text: "hi" }] }],
    });
    expect(api).toHaveBeenCalledTimes(3);
    for (const [, init] of api.mock.calls) {
      expect(init.headers).toEqual({ Authorization: "Bearer the-token" });
      expect(init.cache).toBe("no-store");
    }
  });

  it("asks for the chat only after the list: it needs to know which is the latest", async () => {
    await loadAppData("t");
    const paths = api.mock.calls.map(([url]) => url.replace("http://localhost:8080", ""));
    expect(paths.indexOf("/v1/chats/new")).toBe(2);
  });

  it("uses the server's own address for the API when there is one", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:9000");
    api.mockImplementation(async (url: string) => {
      expect(url.startsWith("http://api.internal:9000/")).toBe(true);
      return routes[url.replace("http://api.internal:9000", "")]!();
    });
    await loadAppData("t");
  });

  it("encodes the chat id in the path", async () => {
    routes["/v1/chats"] = () => json([chat("a b/c", 1)]);
    routes["/v1/chats/a%20b%2Fc"] = () => json({ id: "a b/c", title: "x", timestamp: 1, messages: [] });
    expect((await loadAppData("t")).chatId).toBe("a b/c");
  });

  it.each(["/v1/me", "/v1/chats", "/v1/chats/new"])("says the session is over when %s answers 401", async (path) => {
    routes[path] = () => json({ error: "No", code: "invalid_token" }, 401);
    await expect(loadAppData("t")).rejects.toBeInstanceOf(SessionExpired);
  });

  it("fails with an ordinary error when the API fails, so the browser can load the data itself", async () => {
    routes["/v1/chats"] = () => json({ error: "Down" }, 503);
    const error = await loadAppData("t").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SessionExpired);
    expect((error as Error).message).toContain("503");
  });

  it("fails when the API cannot be reached", async () => {
    api.mockRejectedValue(new TypeError("fetch failed"));
    await expect(loadAppData("t")).rejects.toThrow("fetch failed");
  });
});
