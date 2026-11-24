import { act, render, screen } from "@testing-library/react";
import { Activity, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatStoreProvider } from "@/app/(root)/app/ChatStoreProvider";
import { useChatStore } from "@/stores/chatStore";

const chat = (id: string, timestamp = 1, title = id) => ({ id, title, timestamp, index: 1 });
const chats = [chat("c1", 1, "One")];
const messages = [{ role: "user", index: 0, parts: [{ text: "hi" }] }] as ChatHistory;
const store = () => useChatStore.getState();
const json = (body: unknown) => new Response(JSON.stringify(body));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ id: "c2", title: "Two", timestamp: 9, messages: [] })));
});

describe("ChatStoreProvider (state of the chat page)", () => {
  const mount = () =>
    render(
      <ChatStoreProvider loadedChats={chats} id="c1" messages={messages}>
        <p>chat page</p>
      </ChatStoreProvider>,
    );

  it("shows the page with the chats and messages loaded on the server", () => {
    mount();
    expect(screen.getByText("chat page")).toBeDefined();
    expect(store().chats).toBe(chats);
    expect(store().chatHistory).toBe(messages);
    expect(store().currentSessionId).toBe("c1");
    expect(store()).toMatchObject({ isDeep: false, settingsOpen: false, historyLoading: false, btnMessage: false });
  });

  it("starts the page from a clean state, not from what an earlier visit left", () => {
    useChatStore.setState({ isDeep: true, settingsOpen: true, btnMessage: "old" });
    mount();
    expect(store()).toMatchObject({ isDeep: false, settingsOpen: false, btnMessage: false });
  });

  it("restores the saved persona", () => {
    localStorage.setItem("persona", "Gentle teacher");
    mount();
    expect(store().persona).toBe("Gentle teacher");
  });

  it("keeps the chat state when the page is hidden and shown again", () => {
    // Next.js hides pages with <Activity>: effects are cleaned up and run again
    // when the page returns, but component state survives. The server's snapshot
    // must not overwrite what the user did meanwhile.
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <ChatStoreProvider loadedChats={chats} id="c1" messages={messages}>
          <p>chat page</p>
        </ChatStoreProvider>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    act(() => store().setChatHistory([...messages, { role: "model", index: 1, parts: [{ text: "reply" }] }]));
    act(() => useChatStore.setState({ currentSessionId: "c2" }));

    rerender(page("hidden"));
    rerender(page("visible"));

    expect(store().chatHistory).toHaveLength(2);
    expect(store().currentSessionId).toBe("c2");
  });

  it("does not show the page before the store has been filled", () => {
    const seen: number[] = [];
    function Probe() {
      seen.push(useChatStore.getState().chats.length);
      return <p>probe</p>;
    }
    render(<ChatStoreProvider loadedChats={chats} id="c1" messages={messages}><Probe /></ChatStoreProvider>);
    expect(seen.every((count) => count === 1)).toBe(true);
  });

  it("does not refill the store when the server sends new data to a page that is already open", () => {
    function Host() {
      const [id, setId] = useState("c1");
      return (
        <>
          <button onClick={() => setId("other")}>change</button>
          <ChatStoreProvider loadedChats={chats} id={id} messages={messages}><p>chat page</p></ChatStoreProvider>
        </>
      );
    }
    render(<Host />);
    act(() => screen.getByText("change").click());
    expect(store().currentSessionId).toBe("c1");
  });

  it.each([
    ["landscape (desktop-like)", 1280, 720, true],
    ["portrait (phone-like)", 390, 844, false],
  ])("detects a %s window", (_name, width, height, expected) => {
    vi.stubGlobal("innerWidth", width);
    vi.stubGlobal("innerHeight", height);
    mount();
    expect(store().isPC).toBe(expected);
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
    const reply = [{ role: "model", index: 0, parts: [{ text: "namaste" }] }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ id: "c2", title: "Karma talk", timestamp: 500, messages: reply })));

    act(() => store().setCurrentSessionId("c2"));

    expect(store().currentSessionId).toBe("c2");
    expect(store().historyLoading).toBe(true); // shows a loading state
    expect(fetch).toHaveBeenCalledWith("api/chats/c2");
    await vi.waitFor(() => expect(store().historyLoading).toBe(false));
    expect(store().chatHistory).toEqual(reply);
  });

  it("refreshes the opened chat's title and time in the list without touching the old list", async () => {
    const before = store().chats;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ id: "c2", title: "Karma talk", timestamp: 500, messages: [] })));

    act(() => store().setCurrentSessionId("c2"));
    await vi.waitFor(() => expect(store().historyLoading).toBe(false));

    expect(store().chats[1]).toMatchObject({ id: "c2", title: "Karma talk", timestamp: 500 });
    expect(before[1].title).toBe("old"); // not mutated
  });

  it("leaves the list as it is when the opened chat is not in it", async () => {
    const before = store().chats;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ id: "zz", title: "?", timestamp: 1, messages: [] })));
    act(() => store().setCurrentSessionId("zz"));
    await vi.waitFor(() => expect(store().historyLoading).toBe(false));
    expect(store().chats).toBe(before);
  });

  it("does not reload the chat that is already open", () => {
    act(() => store().setCurrentSessionId("c1"));
    expect(fetch).not.toHaveBeenCalled();
    expect(store().historyLoading).toBe(false);
  });
});
