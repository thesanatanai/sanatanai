import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handleLogin from "@/app/(root)/welcome/handleLogin";
import manage from "@/app/(root)/manageStart";
import { useAppStore } from "@/stores/appStore";
import { fakeApi, json } from "../helpers/api";

// Sign-in answers carry no tokens: those are in the cookies the API sets.
const authResult = {
  expiresIn: 900,
  user: { id: "u1", name: "Shivam", email: "s@example.com", picture: "", preferredLocale: "hi", memories: [] },
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("handleLogin (Google sign-in button)", () => {
  /** jsdom cannot navigate, so location is replaced by a recording stub. */
  function stubLocation() {
    const location = { href: "/welcome" };
    vi.stubGlobal("location", location);
    return location;
  }

  it("sends the Google credential and language to the API, with cookies, then opens the app", async () => {
    const { calls } = fakeApi({ "POST /v1/auth/google": authResult });
    const location = stubLocation();

    await handleLogin({ credential: "google-jwt" } as never, "hi");

    expect(calls).toMatchObject([
      { method: "POST", path: "/v1/auth/google", body: { credential: "google-jwt", locale: "hi" }, credentials: "include" },
    ]);
    expect(localStorage.length).toBe(0); // the session is in cookies, nothing is stored by the page
    expect(location.href).toBe("/app");
  });

  it("stays on the sign-in page when the API rejects the credential", async () => {
    fakeApi({ "POST /v1/auth/google": () => json({ error: "Invalid Google Token", code: "invalid_credential" }, { status: 401 }) });
    const location = stubLocation();

    await handleLogin({ credential: "bad" } as never, "en");

    expect(location.href).toBe("/welcome");
  });

  it("does nothing when Google returned no credential", async () => {
    const { fetchMock } = fakeApi({});
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

  it("only registers the service worker: the chat page brings its own user and chats", async () => {
    stubServiceWorker(undefined);
    const { fetchMock } = fakeApi({});
    manage();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAppStore.getState().fetched).toBe(false);
  });
});
