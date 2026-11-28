import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppBootstrap from "@/app/(root)/AppBootstrap";
import { useAppStore } from "@/stores/appStore";
import { fakeApi, json, signIn } from "../helpers/api";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  manage: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/app/(root)/manageStart", () => ({ default: mocks.manage }));

const app = () => useAppStore.getState();
/** Moves the browser to a page, which is how the store knows whether the user is in the app. */
const visit = (path: string) => window.history.pushState(null, "", path);

function stubMatchMedia(dark: boolean) {
  const query = { matches: dark, onchange: null as null | (() => void) };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(query));
  return query;
}

beforeEach(() => {
  signIn();
  mocks.pathname = "/";
  mocks.manage.mockReset();
  localStorage.clear();
  visit("/");
  document.head.innerHTML = `<meta name="theme-color" content="#123456">`;
  document.body.className = "";
  stubMatchMedia(false);
  fakeApi({ "PATCH /v1/me": {} });
});
afterEach(() => {
  document.head.innerHTML = "";
});

describe("AppBootstrap", () => {
  it("shows every page immediately: the chat page brings its own loading screen", () => {
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("does not hold /app back: the profile arrives with the chat page's data", () => {
    mocks.pathname = "/app";
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("starts the app's start-up routine once", () => {
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    expect(mocks.manage).toHaveBeenCalledTimes(1);
  });

  it("defaults to English with an empty profile", () => {
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    expect(app()).toMatchObject({ language: "en", name: "", email: "", picture: "", fetched: false });
  });
});

describe("app store: theme", () => {
  const start = () => render(<AppBootstrap><p>child</p></AppBootstrap>);

  it("follows the system theme by default and remembers 'auto'", () => {
    stubMatchMedia(true);
    start();
    expect(app().mainTheme).toBe("auto");
    expect(app().theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("auto");
  });

  it("uses the light theme when the system prefers light", () => {
    start();
    expect(app().theme).toBe("light");
  });

  it("restores a saved theme choice", () => {
    localStorage.setItem("theme", "dark");
    start();
    expect(app().mainTheme).toBe("dark");
    expect(app().theme).toBe("dark");
  });

  it("falls back to 'auto' when the saved value is not a theme", () => {
    localStorage.setItem("theme", "purple");
    start();
    expect(app().mainTheme).toBe("auto");
    expect(localStorage.getItem("theme")).toBe("auto");
  });

  it("styles the page and the browser's theme colour for the light theme", () => {
    localStorage.setItem("theme", "light");
    start();
    expect(document.body.classList.contains("light_mode")).toBe(true);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe("#ffffff");
  });

  it("styles the page and the browser's theme colour for the dark theme", () => {
    localStorage.setItem("theme", "dark");
    document.body.classList.add("light_mode");
    start();
    expect(document.body.classList.contains("light_mode")).toBe(false);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe("#000000");
  });

  it("switches and saves the theme when the user picks one", () => {
    start();
    act(() => app().setMainTheme("dark"));
    expect(app().theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("supports picking a theme from the previous one", () => {
    start();
    act(() => app().setMainTheme((previous) => (previous === "auto" ? "light" : "auto")));
    expect(app().mainTheme).toBe("light");
  });

  it("follows the system when it changes while on 'auto'", () => {
    const query = stubMatchMedia(false);
    start();
    expect(app().theme).toBe("light");

    query.matches = true;
    act(() => query.onchange!());
    expect(app().theme).toBe("dark");
  });

  it("keeps a theme the user picked when the system changes", () => {
    const query = stubMatchMedia(false);
    start();
    act(() => app().setMainTheme("light"));
    // Once the user picked a theme the store no longer listens to the system.
    expect(query.onchange).toBeNull();

    query.matches = true;
    query.onchange?.();
    expect(app().theme).toBe("light");
  });
});

describe("app store: language and profile", () => {
  const loaded = () => {
    visit("/app");
    mocks.pathname = "/app";
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    act(() => app().setFetched(true));
  };

  it("keeps the document language in step with the user's choice", () => {
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    expect(document.documentElement.lang).toBe("en");
    act(() => app().setLanguage("hi"));
    expect(document.documentElement.lang).toBe("hi");
  });

  it("saves a language change to the server while in the app", async () => {
    loaded();
    act(() => app().setLanguage("hi"));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://localhost:8080/v1/me");
    expect(init).toMatchObject({ method: "PATCH", body: JSON.stringify({ preferredLocale: "hi" }) });
    expect(init).toMatchObject({ credentials: "omit" });
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer access-1");
  });

  it("saves a change to the name while in the app", async () => {
    loaded();
    act(() => app().setName("Ram"));
    expect(app().name).toBe("Ram");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/v1/me",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "Ram" }) }),
      ),
    );
  });

  it.each([
    ["email", "setEmail", "ram@example.com"],
    ["picture", "setPicture", "ram.png"],
  ] as const)("changes the %s here but does not send it, the API does not let it be changed", (field, setter, value) => {
    loaded();
    act(() => app()[setter](value));
    expect(app()[field]).toBe(value);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not save when the value is only being loaded from the server", () => {
    loaded();
    act(() => app().setName("Shivam", false));
    expect(app().name).toBe("Shivam");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not save anything outside the app", () => {
    render(<AppBootstrap><p>child</p></AppBootstrap>);
    act(() => app().setLanguage("hi"));
    expect(app().language).toBe("hi");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not save before the profile has loaded", () => {
    visit("/app");
    act(() => app().setName("Early"));
    expect(app().name).toBe("Early");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores a change to the value it already has", () => {
    loaded();
    act(() => app().setLanguage("en"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("supports updating a value from its previous value", () => {
    act(() => app().setName("Ram", false));
    act(() => app().setName((previous) => `${previous} Das`, false));
    expect(app().name).toBe("Ram Das");
  });

  it("ignores network failures while saving", async () => {
    loaded();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    act(() => app().setName("Ram"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(app().name).toBe("Ram");
  });
});

describe("app store: hydrateProfile", () => {
  it("takes the user the server loaded, marks the profile as loaded, and saves nothing back", () => {
    visit("/app");
    const { fetchMock } = fakeApi({});
    app().hydrateProfile({ id: "u1", name: "Shivam", email: "s@example.com", picture: "me.png", preferredLocale: "hi", memories: [] });
    expect(app()).toMatchObject({ name: "Shivam", email: "s@example.com", picture: "me.png", language: "hi", fetched: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("app store: loadProfile", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("copies the signed-in user's profile into the app without writing it back", async () => {
    visit("/app");
    app().setFetched(true);
    const { calls } = fakeApi({
      "GET /v1/me": { id: "u1", name: "Shivam", email: "s@example.com", picture: "me.png", preferredLocale: "hi", memories: [] },
    });

    await app().loadProfile();

    expect(app()).toMatchObject({ name: "Shivam", email: "s@example.com", picture: "me.png", language: "hi", fetched: true });
    expect(calls).toMatchObject([{ method: "GET", path: "/v1/me", credentials: "omit", headers: { authorization: "Bearer access-1" } }]); // only the GET, no PATCH
  });

  it("signs the user out when the session cannot be renewed", async () => {
    fakeApi({
      "GET /v1/me": () => json({ error: "Invalid or expired token", code: "invalid_token" }, { status: 401 }),
      "POST /v1/auth/refresh": () => json({ error: "Please sign in again.", code: "invalid_refresh_token" }, { status: 401 }),
    });
    const replace = vi.fn();
    vi.stubGlobal("location", { pathname: "/app", replace });

    await app().loadProfile();

    expect(replace).toHaveBeenCalledWith("/welcome?logout=true");
    expect(app().fetched).toBe(true);
  });

  it("keeps the session when only the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const replace = vi.fn();
    vi.stubGlobal("location", { pathname: "/app", replace });

    await app().loadProfile();

    expect(replace).not.toHaveBeenCalled();
    expect(app().fetched).toBe(true);
  });
});

describe("app store: notifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets a component change one part of the notification", () => {
    app().setNotification({ type: "error" });
    expect(app().notification).toMatchObject({ type: "error", message: "", isOpen: false });
  });

  it("opens, then closes, the notification it was given", () => {
    app().notify("hello", { type: "success" });
    expect(app().notification).toMatchObject({ message: "hello", type: "success", isOpen: false });
    vi.advanceTimersByTime(500);
    expect(app().notification.isOpen).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(app().notification.isOpen).toBe(false);
  });
});
