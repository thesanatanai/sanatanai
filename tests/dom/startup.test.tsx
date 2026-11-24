import jsCookie from "js-cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handleLogin from "@/app/(root)/welcome/handleLogin";
import manage from "@/app/(root)/manageStart";
import { useAppStore } from "@/stores/appStore";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  jsCookie.remove("setupComplete");
});
afterEach(() => jsCookie.remove("setupComplete"));

describe("handleLogin (Google sign-in button)", () => {
  /** jsdom cannot navigate, so location is replaced by a recording stub. */
  function stubLocation() {
    const location = { href: "/welcome" };
    vi.stubGlobal("location", location);
    return location;
  }

  it("sends the Google credential and language to the server, then opens the app", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ message: "User logged in" }));
    vi.stubGlobal("fetch", fetchMock);
    const location = stubLocation();

    await handleLogin({ credential: "google-jwt" } as never, "hi");

    expect(fetchMock).toHaveBeenCalledWith("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "google-jwt", locale: "hi" }),
    });
    expect(jsCookie.get("setupComplete")).toBe("true");
    expect(location.href).toBe("/app");
  });

  it("stays on the sign-in page when the server rejects the credential", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "Invalid Google Token" }, 401)));
    const location = stubLocation();

    await handleLogin({ credential: "bad" } as never, "en");

    expect(jsCookie.get("setupComplete")).toBeUndefined();
    expect(location.href).toBe("/welcome");
  });

  it("does nothing when Google returned no credential", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await handleLogin({} as never, "en");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("survives a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const location = stubLocation();
    await expect(handleLogin({ credential: "x" } as never, "en")).resolves.toBeUndefined();
    expect(location.href).toBe("/welcome");
  });
});

describe("manage (app start-up)", () => {
  function stubServiceWorker(registration: unknown) {
    const serviceWorker = {
      getRegistration: vi.fn().mockResolvedValue(registration),
      register: vi.fn().mockResolvedValue({ scope: "/" }),
    };
    Object.defineProperty(navigator, "serviceWorker", { value: serviceWorker, configurable: true });
    return serviceWorker;
  }
  afterEach(() => Reflect.deleteProperty(navigator, "serviceWorker"));

  it("registers the service worker on the first visit", async () => {
    const serviceWorker = stubServiceWorker(undefined);
    manage();
    await vi.waitFor(() => expect(serviceWorker.register).toHaveBeenCalledWith("/sw.js"));
  });

  it("checks for a newer service worker when one is already installed", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const serviceWorker = stubServiceWorker({ update });
    manage();
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it("does not load the profile for a visitor who has not signed in", async () => {
    stubServiceWorker(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    manage();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAppStore.getState().fetched).toBe(false);
  });

  it("loads the profile of a returning user", async () => {
    stubServiceWorker(undefined);
    jsCookie.set("setupComplete", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json({ userData: { name: "Shivam", email: "s@example.com", picture: "", preferredLocale: "hi" } }),
      ),
    );

    manage();

    await vi.waitFor(() => expect(useAppStore.getState().fetched).toBe(true));
    expect(useAppStore.getState()).toMatchObject({ name: "Shivam", email: "s@example.com", language: "hi" });
  });
});
