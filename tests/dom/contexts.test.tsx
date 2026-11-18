import { act, render, screen, waitFor } from "@testing-library/react";
import { useContext, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AllContext, { All, type usedOnDb } from "@/app/(root)/AllContext";
import PageContext, { PgContext } from "@/app/(root)/app/PageContext";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  manage: vi.fn(),
  loadChat: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/app/(root)/manageStart", () => ({ default: mocks.manage }));
vi.mock("@/utils/chatActions", () => ({ loadChat: mocks.loadChat }));

/** Captures the latest context value so tests can read and drive it. */
let all!: AllProps;
/** The profile setters also take an "also save to the server" flag that AllProps does not declare. */
const profile = (key: "name" | "email" | "picture") => all.userData[key][1] as unknown as usedOnDb<string>[1];
function ProbeAll() {
  const value = useContext(All);
  useEffect(() => {
    all = value;
  });
  return <p>child</p>;
}
let page!: PageContextProps;
function ProbePage() {
  const value = useContext(PageContext);
  useEffect(() => {
    page = value;
  });
  return null;
}

function stubMatchMedia(dark: boolean) {
  const query = { matches: dark, onchange: null as null | (() => void) };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(query));
  return query;
}

beforeEach(() => {
  mocks.pathname = "/";
  mocks.manage.mockReset();
  mocks.loadChat.mockReset();
  localStorage.clear();
  document.head.innerHTML = `<meta name="theme-color" content="#123456">`;
  document.body.className = "";
  stubMatchMedia(false);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
});
afterEach(() => {
  document.head.innerHTML = "";
});

describe("AllContext: loading gate", () => {
  it("shows pages other than /app immediately", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("holds /app back behind the loading screen until the profile has loaded", () => {
    mocks.pathname = "/app";
    render(<AllContext><ProbeAll /></AllContext>);
    expect(screen.queryByText("child")).toBeNull();
    expect(screen.getByText("Sanatan AI")).toBeDefined();

    const { setFetched } = mocks.manage.mock.calls[0][0];
    act(() => setFetched(true));
    expect(screen.getByText("child")).toBeDefined();
  });

  it("starts the app's start-up routine once", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    expect(mocks.manage).toHaveBeenCalledTimes(1);
    expect(Object.keys(mocks.manage.mock.calls[0][0]).sort()).toEqual(
      ["email", "language", "name", "picture", "setFetched"],
    );
  });

  it("defaults to English with an empty profile", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    expect(all.userData.language[0]).toBe("en");
    expect(all.userData.name[0]).toBe("");
    expect(all.userData.email[0]).toBe("");
  });
});

describe("AllContext: theme", () => {
  it("follows the system theme by default and remembers 'auto'", () => {
    stubMatchMedia(true);
    render(<AllContext><ProbeAll /></AllContext>);
    expect(all.userData.mainTheme[0]).toBe("auto");
    expect(all.theme[0]).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("auto");
  });

  it("uses the light theme when the system prefers light", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    expect(all.theme[0]).toBe("light");
  });

  it("restores a saved theme choice", () => {
    localStorage.setItem("theme", "dark");
    render(<AllContext><ProbeAll /></AllContext>);
    expect(all.userData.mainTheme[0]).toBe("dark");
    expect(all.theme[0]).toBe("dark");
  });

  it("styles the page and the browser's theme colour for the light theme", () => {
    localStorage.setItem("theme", "light");
    render(<AllContext><ProbeAll /></AllContext>);
    expect(document.body.classList.contains("light_mode")).toBe(true);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe("#ffffff");
  });

  it("styles the page and the browser's theme colour for the dark theme", () => {
    localStorage.setItem("theme", "dark");
    document.body.classList.add("light_mode");
    render(<AllContext><ProbeAll /></AllContext>);
    expect(document.body.classList.contains("light_mode")).toBe(false);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe("#000000");
  });

  it("switches and saves the theme when the user picks one", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    act(() => all.userData.mainTheme[1]("dark"));
    expect(all.theme[0]).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("follows the system when it changes while on 'auto'", () => {
    const query = stubMatchMedia(false);
    render(<AllContext><ProbeAll /></AllContext>);
    expect(all.theme[0]).toBe("light");

    query.matches = true;
    act(() => query.onchange!());
    expect(all.theme[0]).toBe("dark");
  });
});

describe("AllContext: language and profile", () => {
  const loaded = () => {
    mocks.pathname = "/app";
    render(<AllContext><ProbeAll /></AllContext>);
    act(() => mocks.manage.mock.calls[0][0].setFetched(true));
  };

  it("keeps the document language in step with the user's choice", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    expect(document.documentElement.lang).toBe("en");
    act(() => all.userData.language[1]("hi"));
    expect(document.documentElement.lang).toBe("hi");
  });

  it("saves a language change to the server while in the app", async () => {
    loaded();
    act(() => all.userData.language[1]("hi"));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("api/user", expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ preferredLocale: "hi" }),
      })),
    );
  });

  it("does not save when the value is only being loaded from the server", () => {
    loaded();
    act(() => profile("name")("Shivam", false));
    expect(all.userData.name[0]).toBe("Shivam");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not save anything outside the app", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    act(() => all.userData.language[1]("hi"));
    expect(all.userData.language[0]).toBe("hi");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores a change to the value it already has", () => {
    loaded();
    act(() => all.userData.language[1]("en"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("supports updating a value from its previous value", () => {
    render(<AllContext><ProbeAll /></AllContext>);
    act(() => profile("name")("Ram", false));
    act(() => profile("name")((previous) => `${previous} Das`, false));
    expect(all.userData.name[0]).toBe("Ram Das");
  });
});

describe("PgContext (state of the chat page)", () => {
  const chats = [{ id: "c1", title: "One", timestamp: 1, index: 1 }];
  const messages = [{ role: "user", index: 0, parts: [{ text: "hi" }] }] as ChatHistory;
  const mount = () =>
    render(
      <PgContext loadedChats={chats} id="c1" messages={messages}>
        <ProbePage />
      </PgContext>,
    );

  it("starts from the chats and messages loaded on the server", () => {
    mount();
    expect(page.userData.chats[0]).toBe(chats);
    expect(page.userData.chatHistory[0]).toBe(messages);
    expect(page.userData.currentSessionId[0]).toBe("c1");
    expect(page.isDeep[0]).toBe(false);
    expect(page.settingsOpen[0]).toBe(false);
    expect(page.historyLoading[0]).toBe(false);
  });

  it("restores the saved persona and saves changes to it", () => {
    localStorage.setItem("persona", "Gentle teacher");
    mount();
    expect(page.userData.persona[0]).toBe("Gentle teacher");

    act(() => page.userData.persona[1]("Strict teacher"));
    expect(localStorage.getItem("persona")).toBe("Strict teacher");
  });

  it("loads a chat's messages when the user switches chats", () => {
    mount();
    act(() => page.userData.currentSessionId[1]("c2"));

    expect(page.userData.currentSessionId[0]).toBe("c2");
    expect(mocks.loadChat).toHaveBeenCalledTimes(1);
    expect(mocks.loadChat).toHaveBeenCalledWith("c2", expect.any(Function), expect.any(Function), expect.any(Function));
  });

  it("does not reload the chat that is already open", () => {
    mount();
    act(() => page.userData.currentSessionId[1]("c1"));
    expect(mocks.loadChat).not.toHaveBeenCalled();
  });

  it("detects a landscape (desktop-like) window", () => {
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("innerHeight", 720);
    mount();
    expect(page.isPC).toBe(true);
  });

  it("detects a portrait (phone-like) window", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    mount();
    expect(page.isPC).toBe(false);
  });
});
