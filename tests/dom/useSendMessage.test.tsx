import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/stores/chatStore";
import useSendMessage from "@/utils/useSendMessage";
import { setChat } from "../helpers/stores";
import { fakeApi, json } from "../helpers/api";

const mocks = vi.hoisted(() => ({ stream: vi.fn() }));
vi.mock("@/utils/message", () => ({ default: mocks.stream }));

const msg = (role: "user" | "model", text: string, index: number, extra = {}) =>
  ({ role, index, parts: [{ text }], ...extra }) as ChatHistory[0];
const chat = (id: string, title = "New Chat") => ({ id, title, timestamp: 1, index: 1 });

type Overrides = Partial<{ chatHistory: ChatHistory; chats: Chats; isDeep: boolean }>;
/** The chat history the store holds right now. */
const history = () => useChatStore.getState().chatHistory;

function setup(overrides: Overrides = {}, files: UserFileData[] = []) {
  setChat({ currentSessionId: "chat-1", chats: [chat("chat-1")], ...overrides });
  const setMessage = vi.fn();
  const setFiles = vi.fn();
  const setResponding = vi.fn();
  const { result } = renderHook(() => useSendMessage(setMessage, [files, setFiles], setResponding));
  return { send: result.current, setMessage, setFiles, setResponding };
}

const file = (name: string, type: string, content: string): UserFileData => ({
  filename: name,
  isImage: type.startsWith("image/"),
  wholeData: "",
  maindata: { file: new File([content], name, { type }), type, content },
});

beforeEach(() => {
  mocks.stream.mockReset().mockResolvedValue(undefined);
  fakeApi({ "POST /v1/chats/chat-1/title": { title: "A Chat Title" } });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("useSendMessage: sending", () => {
  it("does nothing for an empty message", () => {
    const { send, setResponding } = setup();
    send("");
    expect(setResponding).not.toHaveBeenCalled();
    expect(history()).toEqual([]);
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it("shows the user's message and an empty, streaming reply straight away", () => {
    const before = [msg("user", "first", 0), msg("model", "reply", 1)];
    const { send, setMessage, setFiles, setResponding } = setup({ chatHistory: before });

    send("second");

    expect(setResponding).toHaveBeenCalledWith(true);
    expect(history()).toEqual([
      ...before,
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
  it("fills in the reply as text arrives, then marks it finished", () => {
    const { send } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    const [, , , onUpdate, onFinish] = mocks.stream.mock.calls[0];

    act(() => onUpdate("Jai Shri"));
    expect(history().at(-1)!.parts[0].text).toBe("Jai Shri");
    expect(history().at(-1)!.streaming).toBe(true);

    act(() => onFinish("Jai Shri Ram"));
    const done = history().at(-1)!;
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
    const { send, setResponding } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");

    await waitFor(() => expect(setResponding).toHaveBeenLastCalledWith(false));
    const failed = history().at(-1)!;
    expect(failed.error).toBe(true);
    expect(failed.streaming).toBe(false);
  });

  it("only ever edits a model message, never the user's", () => {
    const { send } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    const onUpdate = mocks.stream.mock.calls[0][3];
    const onlyUser = [msg("user", "mine", 0)];
    setChat({ chatHistory: onlyUser });
    act(() => onUpdate("oops"));
    expect(history()).toEqual(onlyUser);
  });

  it("does not modify the history it is updating", () => {
    const { send } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    const before = history();
    const snapshot = structuredClone(before);
    act(() => mocks.stream.mock.calls[0][3]("changed"));
    expect(before).toEqual(snapshot);
    expect(history()).not.toBe(before);
  });

  it("ignores updates for an empty history", () => {
    const { send } = setup({ chatHistory: [msg("user", "a", 0), msg("model", "b", 1)] });
    send("q");
    setChat({ chatHistory: [] });
    act(() => mocks.stream.mock.calls[0][3]("x"));
    expect(history()).toEqual([]);
  });
});

describe("useSendMessage: retrying after a failed answer", () => {
  it("replaces the failed question and answer instead of stacking new ones", () => {
    const before = [
      msg("user", "ok question", 0),
      msg("model", "ok answer", 1),
      msg("user", "failed question", 2),
      msg("model", "", 3, { error: true }),
    ];
    const { send } = setup({ chatHistory: before });

    send("retry");

    const next = history();
    expect(next).toHaveLength(4);
    expect(next.slice(0, 2)).toEqual(before.slice(0, 2));
    expect(next[2].parts[0].text).toBe("retry");
    expect(next[3]).toMatchObject({ role: "model", streaming: true });
  });

  it("handles a chat whose only message is the failed answer", () => {
    const { send } = setup({ chatHistory: [msg("model", "", 0, { error: true })] });
    send("retry");
    const next = history();
    expect(next).toHaveLength(2);
    expect(next[0].parts[0].text).toBe("retry");
    expect(next[1]).toMatchObject({ role: "model", streaming: true });
  });
});

describe("useSendMessage: naming new chats", () => {
  it("asks for a title after the first message and puts it in the sidebar", async () => {
    const chats = [chat("chat-1"), chat("chat-2", "Other")];
    const { send } = setup({ chats, chatHistory: [] });

    send("What is dharma?");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://localhost:8080/v1/chats/chat-1/title");
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ message: "What is dharma?" }) });
    await waitFor(() => expect(useChatStore.getState().chats[0].title).toBe("A Chat Title"));
    const updated = useChatStore.getState().chats;
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
    fakeApi({
      "POST /v1/chats/chat-1/title": () => json({ error: "Sorry, something went wrong", code: "internal" }, { status: 500 }),
    });
    const { send } = setup({ chatHistory: [] });
    send("hello");

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(useChatStore.getState().chats[0].title).toBe("New Chat");
  });
});
