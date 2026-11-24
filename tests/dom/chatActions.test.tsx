import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/stores/chatStore";
import {
  createNewChat,
  deleteChat,
  deleteMessage,
  getChats,
  loadChat,
  updateChat,
} from "@/utils/chatActions";
import { setSession } from "@/utils/session";
import { setChat } from "../helpers/stores";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const chat = (id: string, timestamp: number, title = id) => ({
  id,
  title,
  timestamp,
  index: 1,
});
const store = () => useChatStore.getState();

type Route = (init?: RequestInit) => Response | Promise<Response>;
/** fetch() stub that answers by "METHOD url". */
function stubApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const route = routes[key];
    if (!route) throw new Error(`Unexpected request: ${key}`);
    return route(init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
/** What a chat that has no messages yet looks like when it is opened. */
const emptyChat = (id: string) => () => json({ ...chat(id, 1), messages: [] });

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("setSession", () => {
  it("picks the most recently used chat", () => {
    const setCurrent = vi.fn();
    const id = setSession(
      [chat("old", 1), chat("newest", 30), chat("middle", 20)],
      setCurrent,
    );
    expect(id).toBe("newest");
    expect(setCurrent).toHaveBeenCalledWith("newest");
  });

  it("works without a setter", () => {
    expect(setSession([chat("only", 5)])).toBe("only");
  });
});

describe("getChats", () => {
  it("loads the chat list into the store", async () => {
    stubApi({ "GET api/chats": () => json([chat("a", 1), chat("b", 2)]) });
    setChat({ currentSessionId: "a" });

    const chats = await getChats();

    expect(chats).toHaveLength(2);
    expect(store().chats).toEqual(chats);
    expect(store().currentSessionId).toBe("a"); // the open chat is left alone
  });

  it("also opens the latest chat when asked to", async () => {
    stubApi({
      "GET api/chats": () => json([chat("a", 1), chat("b", 2)]),
      "GET api/chats/b": emptyChat("b"),
    });
    setChat({ currentSessionId: "a" });

    await getChats(true);

    expect(store().currentSessionId).toBe("b");
  });
});

describe("createNewChat", () => {
  it("creates a chat, switches to it and refreshes the list", async () => {
    stubApi({
      "POST api/chats": () => json({ id: "fresh" }),
      "GET api/chats": () => json([chat("fresh", 99)]),
      "GET api/chats/fresh": emptyChat("fresh"),
    });

    await createNewChat();

    expect(store().currentSessionId).toBe("fresh");
    await vi.waitFor(() => expect(store().chats).toEqual([chat("fresh", 99)]));
  });

  it("swallows network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(createNewChat()).resolves.toBeUndefined();
  });
});

describe("loadChat", () => {
  it("shows a loading state, loads the messages and refreshes the title in the list", async () => {
    const messages = [{ role: "user", index: 1, parts: [{ text: "hi" }] }];
    stubApi({
      "GET api/chats/b": () =>
        json({ id: "b", title: "Karma talk", timestamp: 500, messages }),
    });
    setChat({ chats: [chat("a", 1, "A"), chat("b", 2, "old title")] });
    const before = store().chats;

    const loading = loadChat("b");
    expect(store().historyLoading).toBe(true);
    await loading;

    expect(store().historyLoading).toBe(false);
    expect(store().chatHistory).toEqual(messages);
    expect(store().chats[1]).toMatchObject({
      id: "b",
      title: "Karma talk",
      timestamp: 500,
    });
    expect(before[1].title).toBe("old title"); // not mutated
  });
});

describe("deleteChat", () => {
  it("deletes a chat and refreshes the list", async () => {
    stubApi({
      "DELETE api/chats/b": () => json({ message: "Done" }),
      "GET api/chats": () => json([chat("a", 1)]),
    });
    setChat({ chats: [chat("a", 1), chat("b", 2)], currentSessionId: "a" });

    await deleteChat("b");

    expect(store().chats).toEqual([chat("a", 1)]);
    expect(store().currentSessionId).toBe("a"); // "a" stays selected
  });

  it("switches to the latest remaining chat when the open chat is deleted", async () => {
    stubApi({
      "DELETE api/chats/gone": () => json({ message: "Done" }),
      "GET api/chats": () => json([chat("a", 1), chat("b", 5)]),
      "GET api/chats/b": emptyChat("b"),
    });
    setChat({ currentSessionId: "gone" });

    await deleteChat("gone");

    expect(store().currentSessionId).toBe("b");
  });

  it("lands on the chat the server creates when the last one is deleted", async () => {
    // GET /api/chats never returns an empty list: when a user has no chats the
    // server creates one and returns it, so deleting the last chat selects it.
    stubApi({
      "DELETE api/chats/only": () => json({ message: "Done" }),
      "GET api/chats": () => json([chat("fresh", 99)]),
      "GET api/chats/fresh": emptyChat("fresh"),
    });
    setChat({ currentSessionId: "only" });

    await deleteChat("only");

    expect(store().currentSessionId).toBe("fresh");
  });

  it("asks the server for a new chat if the list somehow comes back empty", async () => {
    const fetchMock = stubApi({
      "DELETE api/chats/only": () => json({ message: "Done" }),
      "GET api/chats": () => json([]),
      "POST api/chats": () => json({ id: "new" }),
      "GET api/chats/new": emptyChat("new"),
    });
    setChat({ currentSessionId: "open" }); // not the deleted chat, so nothing is selected from the empty list
    await deleteChat("only");

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("api/chats", { method: "POST" }));
    await vi.waitFor(() => expect(store().currentSessionId).toBe("new"));
  });

  it("swallows network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(deleteChat("a")).resolves.toBeUndefined();
  });
});

describe("updateChat", () => {
  it("saves changes with PUT /api/chats/:id", async () => {
    const fetchMock = stubApi({
      "PUT api/chats/b": () => json({ message: "Done" }),
    });
    await updateChat("b", { title: "New title" });
    expect(fetchMock).toHaveBeenCalledWith("api/chats/b", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New title" }),
    });
  });

  it("swallows network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(updateChat("b", { title: "x" })).resolves.toBeUndefined();
  });
});

describe("deleteMessage", () => {
  const message = (
    role: "user" | "model",
    text: string,
    index: number,
    extra = {},
  ) => ({ role, index, parts: [{ text, ...extra }] }) as ChatHistory[0];

  function setup(history: ChatHistory) {
    setChat({ chatHistory: history, currentSessionId: "chat-7" });
    const fetchMock = stubApi({
      "PUT api/chats/chat-7": () => json({ message: "Done" }),
    });
    return { fetchMock };
  }

  it("removes a message locally and saves the shortened chat", async () => {
    const history = [
      message("user", "a", 1),
      message("model", "b", 2),
      message("user", "c", 3),
    ];
    const { fetchMock } = setup(history);

    await act(() => deleteMessage(1));

    const expected = [history[0], history[2]];
    expect(store().chatHistory).toEqual(expected);
    expect(fetchMock).toHaveBeenCalledWith(
      "api/chats/chat-7",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      messages: expected,
    });
  });

  it("removes exactly one message, leaving its neighbours in place", async () => {
    // Tool calls and results are not stored in chat history (only the visible
    // text is saved), so there is no paired message to remove with it.
    const history = [
      message("user", "a", 1),
      message("model", "b", 2),
      message("user", "c", 3),
      message("model", "d", 4),
    ];
    setup(history);

    await act(() => deleteMessage(1));

    expect(store().chatHistory).toEqual([history[0], history[2], history[3]]);
  });

  it("does not modify the original history", async () => {
    const history = [message("user", "a", 1), message("model", "b", 2)];
    const snapshot = structuredClone(history);
    setup(history);
    await act(() => deleteMessage(0));
    expect(history).toEqual(snapshot);
  });

  it("ignores an index that does not exist", async () => {
    const history = [message("user", "a", 1)];
    const { fetchMock } = setup(history);
    await act(() => deleteMessage(5));
    expect(store().chatHistory).toBe(history);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
