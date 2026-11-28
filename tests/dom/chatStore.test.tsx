import { act, render, screen } from "@testing-library/react";
import { Activity, Component, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatStoreProvider } from "@/app/(root)/app/ChatStoreProvider";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { fakeApi, json, signIn } from "../helpers/api";

const chat = (id: string, timestamp = 1, title = id) => ({ id, title, timestamp, index: 1 });
const chats = [chat("c1", 1, "One")];
/** What the API stores: no `index`. The store adds the position itself. */
const stored = [{ role: "user", parts: [{ text: "hi" }] }];
const messages = [{ role: "user", index: 1, parts: [{ text: "hi" }] }] as ChatHistory;
const store = () => useChatStore.getState();
const user = { id: "u1", name: "Shivam", email: "s@example.com", picture: "me.png", preferredLocale: "hi" as const, memories: [] as string[] };

/** The API with one chat list and one chat. */
const stubApi = () =>
  fakeApi({
    "GET /v1/me": user,
    "GET /v1/chats": chats,
    "GET /v1/chats/c1": { id: "c1", title: "One", timestamp: 1, messages: stored },
  });

beforeEach(() => {
  signIn();
  stubApi();
});

class Catcher extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <p>error: {this.state.error.message}</p> : this.props.children;
  }
}

describe("ChatStoreProvider when the browser has to load the data itself (the server could not)", () => {
  const mount = async () => {
    render(
      <ChatStoreProvider accessToken={null} initial={null}>
        <p>chat page</p>
      </ChatStoreProvider>,
    );
    await screen.findByText("chat page");
  };

  it("shows the page with the chats and latest chat the API returned, and the user", async () => {
    await mount();
    expect(useAppStore.getState()).toMatchObject({ name: "Shivam", language: "hi", fetched: true });
    expect(store().chats).toEqual(chats);
    expect(store().chatHistory).toEqual(messages);
    expect(store().currentSessionId).toBe("c1");
    expect(store()).toMatchObject({ isDeep: false, settingsOpen: false, historyLoading: false, btnMessage: false });
  });

  it("opens the most recently used chat", async () => {
    fakeApi({
      "GET /v1/me": user,
      "GET /v1/chats": [chat("old", 1), chat("new", 50), chat("mid", 20)],
      "GET /v1/chats/new": { id: "new", title: "new", timestamp: 50, messages: stored },
    });
    await mount();
    expect(store().currentSessionId).toBe("new");
  });

  it("holds the page back, behind the loading screen, until the data has arrived", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    fakeApi({
      "GET /v1/me": user,
      "GET /v1/chats": async () => {
        await gate;
        return json(chats);
      },
      "GET /v1/chats/c1": { id: "c1", title: "One", timestamp: 1, messages: stored },
    });
    render(
      <ChatStoreProvider accessToken={null} initial={null}>
        <p>chat page</p>
      </ChatStoreProvider>,
    );
    expect(screen.queryByText("chat page")).toBeNull();
    expect(screen.getByText("Sanatan AI")).toBeDefined();
    release();
    expect(await screen.findByText("chat page")).toBeDefined();
  });

  it("starts the page from a clean state, not from what an earlier visit left", async () => {
    useChatStore.setState({ isDeep: true, settingsOpen: true, btnMessage: "old" });
    await mount();
    expect(store()).toMatchObject({ isDeep: false, settingsOpen: false, btnMessage: false });
  });

  it("restores the saved persona", async () => {
    localStorage.setItem("persona", "Gentle teacher");
    await mount();
    expect(store().persona).toBe("Gentle teacher");
  });

  it("keeps the chat state when the page is hidden and shown again", async () => {
    // Next.js hides pages with <Activity>: effects are cleaned up and run again
    // when the page returns, but component state survives. What was loaded must
    // not overwrite what the user did meanwhile.
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <ChatStoreProvider accessToken={null} initial={null}>
          <p>chat page</p>
        </ChatStoreProvider>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await screen.findByText("chat page");
    act(() => store().setChatHistory([...messages, { role: "model", index: 2, parts: [{ text: "reply" }] }]));
    act(() => useChatStore.setState({ currentSessionId: "c2" }));

    rerender(page("hidden"));
    rerender(page("visible"));

    expect(store().chatHistory).toHaveLength(2);
    expect(store().currentSessionId).toBe("c2");
  });

  it("does not show the page before the store has been filled", async () => {
    const seen: number[] = [];
    function Probe() {
      seen.push(useChatStore.getState().chats.length);
      return <p>probe</p>;
    }
    render(
      <ChatStoreProvider accessToken={null} initial={null}>
        <Probe />
      </ChatStoreProvider>,
    );
    await screen.findByText("probe");
    expect(seen.every((count) => count === 1)).toBe(true);
  });

  it("hands a failure to the error screen instead of showing an empty chat", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeApi({ "GET /v1/me": user, "GET /v1/chats": () => json({ error: "Down", code: "internal" }, { status: 500 }) });
    render(
      <Catcher>
        <ChatStoreProvider accessToken={null} initial={null}>
          <p>chat page</p>
        </ChatStoreProvider>
      </Catcher>,
    );
    expect(await screen.findByText("error: Down")).toBeDefined();
    expect(screen.queryByText("chat page")).toBeNull();
  });

  it.each([
    ["landscape (desktop-like)", 1280, 720, true],
    ["portrait (phone-like)", 390, 844, false],
  ])("detects a %s window", async (_name, width, height, expected) => {
    vi.stubGlobal("innerWidth", width);
    vi.stubGlobal("innerHeight", height);
    await mount();
    expect(store().isPC).toBe(expected);
  });
});

describe("ChatStoreProvider with what the server loaded", () => {
  const initial = { user, chats, chatId: "c1", messages: stored as ChatHistory };
  const mount = (props: Partial<{ accessToken: string | null; initial: typeof initial | null }> = {}) =>
    render(
      <ChatStoreProvider accessToken="server-access" initial={initial} {...props}>
        <p>chat page</p>
      </ChatStoreProvider>,
    );

  it("fills the stores from it without asking the API for anything", async () => {
    const { fetchMock } = fakeApi({});
    mount();
    expect(await screen.findByText("chat page")).toBeDefined();
    expect(store().chats).toEqual(chats);
    expect(store().chatHistory).toEqual(messages);
    expect(store().currentSessionId).toBe("c1");
    expect(useAppStore.getState()).toMatchObject({ name: "Shivam", email: "s@example.com", language: "hi", fetched: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the access token in memory, and nowhere else", async () => {
    mount();
    await screen.findByText("chat page");
    expect(useAuthStore.getState().accessToken).toBe("server-access");
    const stored = [localStorage, sessionStorage].flatMap((area) => Object.values(area));
    expect(stored.join("\n")).not.toContain("server-access");
    expect(document.cookie).not.toContain("server-access");
  });

  it("does not save the user's own values back to the server, even on the chat page", async () => {
    vi.stubGlobal("location", { pathname: "/app", replace: vi.fn() }); // where saving a profile change is switched on
    const { fetchMock } = fakeApi({});
    mount();
    await screen.findByText("chat page");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hands the token over before the page renders, so its first call is already signed in", async () => {
    const seen: (string | null)[] = [];
    function Probe() {
      seen.push(useAuthStore.getState().accessToken);
      return <p>probe</p>;
    }
    render(
      <ChatStoreProvider accessToken="server-access" initial={initial}>
        <Probe />
      </ChatStoreProvider>,
    );
    await screen.findByText("probe");
    expect(seen.every((token) => token === "server-access")).toBe(true);
  });

  it("uses a token even when the server could not load the data, and then loads it in the browser", async () => {
    const { calls } = stubApi();
    mount({ initial: null });
    expect(await screen.findByText("chat page")).toBeDefined();
    expect(useAuthStore.getState().accessToken).toBe("server-access");
    expect(calls[0].headers.authorization).toBe("Bearer server-access");
  });

  it("keeps what the user did when the page is hidden and shown again", async () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <ChatStoreProvider accessToken="server-access" initial={initial}>
          <p>chat page</p>
        </ChatStoreProvider>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await screen.findByText("chat page");
    act(() => useChatStore.setState({ currentSessionId: "c2" }));
    rerender(page("hidden"));
    rerender(page("visible"));
    expect(store().currentSessionId).toBe("c2");
  });
});

describe("chat store: setters", () => {
  it("saves changes to the persona in the browser", () => {
    act(() => store().setPersona("Strict teacher"));
    expect(store().persona).toBe("Strict teacher");
    expect(localStorage.getItem("persona")).toBe("Strict teacher");
  });

  it("supports updating a value from its previous value", () => {
    act(() => store().setIsDeep((previous) => !previous));
    act(() => store().setSettingsOpen((previous) => !previous));
    act(() => store().setChats((previous) => [...previous, chat("x")]));
    act(() => store().setChatHistory((previous) => [...previous, ...messages]));
    expect(store()).toMatchObject({ isDeep: true, settingsOpen: true });
    expect(store().chats).toEqual([chat("x")]);
    expect(store().chatHistory).toEqual(messages);
  });

  it("holds the message a chat button asked to send", () => {
    act(() => store().setBtnMessage("Yes"));
    expect(store().btnMessage).toBe("Yes");
    act(() => store().setBtnMessage(false));
    expect(store().btnMessage).toBe(false);
  });
});

describe("chat store: switching chats", () => {
  beforeEach(() => {
    useChatStore.setState({ chats: [chat("c1", 1, "One"), chat("c2", 2, "old")], currentSessionId: "c1", chatHistory: messages });
  });

  it("loads a chat's messages when the user switches chats", async () => {
    const reply = [{ role: "model", parts: [{ text: "namaste" }] }];
    const { calls } = fakeApi({ "GET /v1/chats/c2": { id: "c2", title: "Karma talk", timestamp: 500, messages: reply } });

    act(() => store().setCurrentSessionId("c2"));

    expect(store().currentSessionId).toBe("c2");
    expect(store().historyLoading).toBe(true); // shows a loading state
    expect(calls).toMatchObject([{ method: "GET", path: "/v1/chats/c2", credentials: "omit", headers: { authorization: "Bearer access-1" } }]);
    await vi.waitFor(() => expect(store().historyLoading).toBe(false));
    expect(store().chatHistory).toEqual([{ ...reply[0], index: 1 }]);
  });

  it("refreshes the opened chat's title and time in the list without touching the old list", async () => {
    const before = store().chats;
    fakeApi({ "GET /v1/chats/c2": { id: "c2", title: "Karma talk", timestamp: 500, messages: [] } });

    act(() => store().setCurrentSessionId("c2"));
    await vi.waitFor(() => expect(store().historyLoading).toBe(false));

    expect(store().chats[1]).toMatchObject({ id: "c2", title: "Karma talk", timestamp: 500 });
    expect(before[1].title).toBe("old"); // not mutated
  });

  it("leaves the list as it is when the opened chat is not in it", async () => {
    const before = store().chats;
    fakeApi({ "GET /v1/chats/zz": { id: "zz", title: "?", timestamp: 1, messages: [] } });
    act(() => store().setCurrentSessionId("zz"));
    await vi.waitFor(() => expect(store().historyLoading).toBe(false));
    expect(store().chats).toBe(before);
  });

  it("does not reload the chat that is already open", () => {
    const { fetchMock } = fakeApi({});
    act(() => store().setCurrentSessionId("c1"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store().historyLoading).toBe(false);
  });
});
