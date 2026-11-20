import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PageContext from "@/app/(root)/app/PageContext";
import useSendMessage from "@/utils/useSendMessage";
import { makePage, type PageOverrides } from "../helpers/contexts";

const mocks = vi.hoisted(() => ({ stream: vi.fn() }));
vi.mock("@/utils/message", () => ({ default: mocks.stream }));

const msg = (role: "user" | "model", text: string, index: number, extra = {}) =>
  ({ role, index, parts: [{ text }], ...extra }) as ChatHistory[0];
const chat = (id: string, title = "New Chat") => ({ id, title, timestamp: 1, index: 1 });

function setup(overrides: PageOverrides = {}, files: UserFileData[] = []) {
  const page = makePage({ currentSessionId: "chat-1", chats: [chat("chat-1")], ...overrides });
  const setMessage = vi.fn();
  const setFiles = vi.fn();
  const setResponding = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PageContext.Provider value={page}>{children}</PageContext.Provider>
  );
  const { result } = renderHook(() => useSendMessage(setMessage, [files, setFiles], setResponding), {
    wrapper,
  });
  const setHistory = page.userData.chatHistory[1];
  /** Applies every functional setHistory update, in order, to a starting history. */
  const applyUpdates = (start: ChatHistory) =>
    setHistory.mock.calls
      .map(([arg]) => arg)
      .filter((arg): arg is (h: ChatHistory) => ChatHistory => typeof arg === "function")
      .reduce((state, update) => update(state), start);
  return { page, send: result.current, setMessage, setFiles, setResponding, setHistory, applyUpdates };
}

const file = (name: string, type: string, content: string): UserFileData => ({
  filename: name,
  isImage: type.startsWith("image/"),
  wholeData: "",
  maindata: { file: new File([content], name, { type }), type, content },
});

beforeEach(() => {
  mocks.stream.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("A Chat Title")));
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("useSendMessage: sending", () => {
  it("does nothing for an empty message", () => {
    const { send, setResponding, setHistory } = setup();
    send("");
    expect(setResponding).not.toHaveBeenCalled();
    expect(setHistory).not.toHaveBeenCalled();
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it("shows the user's message and an empty, streaming reply straight away", () => {
    const history = [msg("user", "first", 0), msg("model", "reply", 1)];
    const { send, setHistory, setMessage, setFiles, setResponding } = setup({ chatHistory: history });

    send("second");

    expect(setResponding).toHaveBeenCalledWith(true);
    expect(setHistory).toHaveBeenCalledWith([
      ...history,
      msg("user", "second", 2),
      { role: "model", index: 3, parts: [{ text: "" }], streaming: true },
    ]);
    expect(setMessage).toHaveBeenCalledWith("");
    expect(setFiles).toHaveBeenCalledWith([]);
  });

  it("streams the answer for the open chat", () => {
    const { send } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("hello");
    expect(mocks.stream).toHaveBeenCalledWith(
      msg("user", "hello", 2),
      "chat-1",
      false,
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("passes Deep Think on to the request", () => {
    const { send } = setup({ isDeep: true, chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("hello");
    expect(mocks.stream.mock.calls[0][2]).toBe(true);
  });

  it("attaches files, sending JSON files as plain text", () => {
    const { send } = setup(
      { chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] },
      [file("data.json", "application/json", "e30="), file("pic.png", "image/png", "aW1n")],
    );
    send("look");
    expect(mocks.stream.mock.calls[0][0].parts).toEqual([
      { text: "look" },
      { inlineData: { mimeType: "text/plain", data: "e30=" } },
      { inlineData: { mimeType: "image/png", data: "aW1n" } },
    ]);
  });
});

describe("useSendMessage: the streamed answer", () => {
  const start = [msg("user", "q", 0), { role: "model", index: 1, parts: [{ text: "" }], streaming: true }] as ChatHistory;

  it("fills in the reply as text arrives, then marks it finished", () => {
    const { send, applyUpdates } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    const [, , , onUpdate, onFinish] = mocks.stream.mock.calls[0];

    act(() => onUpdate("Jai Shri"));
    expect(applyUpdates(start).at(-1)!.parts[0].text).toBe("Jai Shri");

    act(() => onFinish("Jai Shri Ram"));
    const done = applyUpdates(start).at(-1)!;
    expect(done.parts[0].text).toBe("Jai Shri Ram");
    expect(done.streaming).toBe(false);
    expect(done.error).toBe(false);
  });

  it("stops responding once the stream ends", async () => {
    const { send, setResponding } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    await waitFor(() => expect(setResponding).toHaveBeenLastCalledWith(false));
  });

  it("marks the reply as failed when the stream reports an error", async () => {
    mocks.stream.mockResolvedValue(true);
    const { send, setResponding, applyUpdates } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");

    await waitFor(() => expect(setResponding).toHaveBeenLastCalledWith(false));
    const failed = applyUpdates(start).at(-1)!;
    expect(failed.error).toBe(true);
    expect(failed.streaming).toBe(false);
  });

  it("only ever edits a model message, never the user's", () => {
    const { send, applyUpdates } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    const onUpdate = mocks.stream.mock.calls[0][3];
    act(() => onUpdate("oops"));
    const onlyUser = [msg("user", "mine", 0)];
    expect(applyUpdates(onlyUser)).toEqual(onlyUser);
  });

  it("does not modify the history it is updating", () => {
    const { send, applyUpdates } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    act(() => mocks.stream.mock.calls[0][3]("changed"));
    const snapshot = structuredClone(start);
    applyUpdates(start);
    expect(start).toEqual(snapshot);
  });

  it("ignores updates for an empty history", () => {
    const { send, applyUpdates } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    act(() => mocks.stream.mock.calls[0][3]("x"));
    expect(applyUpdates([])).toEqual([]);
  });
});

describe("useSendMessage: retrying after a failed answer", () => {
  it("replaces the failed question and answer instead of stacking new ones", () => {
    const history = [
      msg("user", "ok question", 0),
      msg("model", "ok answer", 1),
      msg("user", "failed question", 2),
      msg("model", "", 3, { error: true }),
    ];
    const { send, setHistory } = setup({ chatHistory: history });

    send("retry");

    const next = setHistory.mock.calls[0][0] as ChatHistory;
    expect(next).toHaveLength(4);
    expect(next.slice(0, 2)).toEqual(history.slice(0, 2));
    expect(next[2].parts[0].text).toBe("retry");
    expect(next[3]).toMatchObject({ role: "model", streaming: true });
  });

  it("handles a chat whose only message is the failed answer", () => {
    const { send, setHistory } = setup({ chatHistory: [msg("model", "", 0, { error: true })] });
    send("retry");
    const next = setHistory.mock.calls[0][0] as ChatHistory;
    expect(next).toHaveLength(2);
    expect(next[0].parts[0].text).toBe("retry");
    expect(next[1]).toMatchObject({ role: "model", streaming: true });
  });
});

describe("useSendMessage: naming new chats", () => {
  it("asks for a title after the first message and puts it in the sidebar", async () => {
    const chats = [chat("chat-1"), chat("chat-2", "Other")];
    const { send, page } = setup({ chats, chatHistory: [] });

    send("What is dharma?");

    expect(fetch).toHaveBeenCalledWith("/api/chat/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newMessage: "What is dharma?", chatId: "chat-1" }),
    });
    const setChats = page.userData.chats[1];
    await waitFor(() => expect(setChats).toHaveBeenCalled());
    const updated = setChats.mock.calls[0][0] as Chats;
    expect(updated[0].title).toBe("A Chat Title");
    expect(updated[0].timestamp).toBeGreaterThan(1);
    expect(updated[1]).toEqual(chats[1]);
    expect(chats[0].title).toBe("New Chat"); // the original list is not mutated
  });

  it("does not ask again once the chat has an answer", () => {
    const { send } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("follow-up");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("skips naming when the chat is not in the list", () => {
    const { send } = setup({ chats: [chat("other")], chatHistory: [] });
    send("hello");
    expect(fetch).not.toHaveBeenCalled();
  });

  // Regression test for a bug that has been fixed (see CHANGELOG).
  it("does not use an error response as the chat title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Sorry, something went wrong" }), { status: 500 }),
      ),
    );
    const { send, page } = setup({ chatHistory: [] });
    send("hello");

    const setChats = page.userData.chats[1];
    await new Promise((resolve) => setTimeout(resolve, 50));
    const titles = setChats.mock.calls.map(([updated]) => (updated as Chats)[0].title);
    expect(titles.every((title) => !title.includes("error"))).toBe(true);
  });
});
