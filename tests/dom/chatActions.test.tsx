import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PageContext from "@/app/(root)/app/PageContext";
import {
  createNewChat,
  deleteChat,
  getChats,
  loadChat,
  setSession,
  updateChat,
  useDeleteMessage,
} from "@/utils/chatActions";
import { makePage } from "../helpers/contexts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const chat = (id: string, timestamp: number, title = id) => ({
  id,
  title,
  timestamp,
  index: 1,
});

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
  it("loads the chat list and selects the latest chat when asked to", async () => {
    stubApi({ "GET api/chats": () => json([chat("a", 1), chat("b", 2)]) });
    const setChats = vi.fn();
    const setSessionId = vi.fn();

    const chats = await getChats(setChats, setSessionId);

    expect(chats).toHaveLength(2);
    expect(setChats).toHaveBeenCalledWith(chats);
    expect(setSessionId).toHaveBeenCalledWith("b");
  });

  it("does not touch the selected chat when no setter is given", async () => {
    stubApi({ "GET api/chats": () => json([chat("a", 1)]) });
    const setChats = vi.fn();
    await getChats(setChats);
    expect(setChats).toHaveBeenCalled();
  });
});

describe("createNewChat", () => {
  it("creates a chat, switches to it and refreshes the list", async () => {
    stubApi({
      "PATCH api/chats": () => json({ id: "fresh" }),
      "GET api/chats": () => json([chat("fresh", 99)]),
    });
    const setCurrent = vi.fn();
    const setChats = vi.fn();

    await createNewChat(setCurrent, setChats);

    expect(setCurrent).toHaveBeenCalledWith("fresh");
    await vi.waitFor(() =>
      expect(setChats).toHaveBeenCalledWith([chat("fresh", 99)]),
    );
  });

  it("swallows network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(createNewChat(vi.fn())).resolves.toBeUndefined();
  });
});

describe("loadChat", () => {
  it("shows a loading state, loads the messages and refreshes the title in the list", async () => {
    const messages = [{ role: "user", index: 1, parts: [{ text: "hi" }] }];
    stubApi({
      "POST api/chats": (init) => {
        expect(JSON.parse(init!.body as string)).toEqual({ id: "b" });
        return json({ id: "b", title: "Karma talk", timestamp: 500, messages });
      },
    });
    const setHistory = vi.fn();
    const setLoading = vi.fn();
    const setChats = vi.fn();

    await loadChat("b", setHistory, setLoading, setChats);

    expect(setLoading.mock.calls).toEqual([[true], [false]]);
    expect(setHistory).toHaveBeenCalledWith(messages);

    const updater = setChats.mock.calls[0][0] as (chats: Chats) => Chats;
    const before = [chat("a", 1, "A"), chat("b", 2, "old title")];
    expect(updater(before)[1]).toMatchObject({
      id: "b",
      title: "Karma talk",
      timestamp: 500,
    });
    expect(before[1].title).toBe("old title"); // not mutated
    expect(updater([chat("a", 1)])).toEqual([chat("a", 1)]); // unknown chat: unchanged
  });
});

describe("deleteChat", () => {
  it("deletes a chat and refreshes the list", async () => {
    stubApi({
      "DELETE api/chats": (init) => {
        expect(JSON.parse(init!.body as string)).toEqual({ id: "b" });
        return json({ message: "Done" });
      },
      "GET api/chats": () => json([chat("a", 1)]),
    });
    const setChats = vi.fn();
    const setSessionId = vi.fn();

    await deleteChat([setChats, "a"], ["b", setSessionId]);

    expect(setChats).toHaveBeenCalledWith([chat("a", 1)]);
    expect(setSessionId).not.toHaveBeenCalled(); // "a" stays selected
  });

  it("switches to the latest remaining chat when the open chat is deleted", async () => {
    stubApi({
      "DELETE api/chats": () => json({ message: "Done" }),
      "GET api/chats": () => json([chat("a", 1), chat("b", 5)]),
    });
    const setSessionId = vi.fn();
    await deleteChat([vi.fn(), "gone"], ["gone", setSessionId]);
    expect(setSessionId).toHaveBeenCalledWith("b");
  });

  it("lands on the chat the server creates when the last one is deleted", async () => {
    // GET /api/chats never returns an empty list: when a user has no chats the
    // server creates one and returns it, so deleting the last chat selects it.
    stubApi({
      "DELETE api/chats": () => json({ message: "Done" }),
      "GET api/chats": () => json([chat("fresh", 99)]),
    });
    const setSessionId = vi.fn();
    await deleteChat([vi.fn(), "only"], ["only", setSessionId]);
    expect(setSessionId).toHaveBeenCalledWith("fresh");
  });

  it("swallows network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      deleteChat([vi.fn(), "a"], ["a", vi.fn()]),
    ).resolves.toBeUndefined();
  });
});

describe("updateChat", () => {
  it("saves changes with PUT /api/chats", async () => {
    const fetchMock = stubApi({
      "PUT api/chats": () => json({ message: "Done" }),
    });
    await updateChat("b", { title: "New title" });
    expect(fetchMock).toHaveBeenCalledWith("api/chats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "b", title: "New title" }),
    });
  });

  it("swallows network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(updateChat("b", { title: "x" })).resolves.toBeUndefined();
  });
});

describe("useDeleteMessage", () => {
  const message = (
    role: "user" | "model",
    text: string,
    index: number,
    extra = {},
  ) => ({ role, index, parts: [{ text, ...extra }] }) as ChatHistory[0];

  function setup(history: ChatHistory) {
    const page = makePage({ chatHistory: history, currentSessionId: "chat-7" });
    const fetchMock = stubApi({
      "PUT api/chats": () => json({ message: "Done" }),
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PageContext.Provider value={page}>{children}</PageContext.Provider>
    );
    const { result } = renderHook(() => useDeleteMessage(), { wrapper });
    return { page, fetchMock, deleteMessage: result.current };
  }

  it("removes a message locally and saves the shortened chat", async () => {
    const history = [
      message("user", "a", 1),
      message("model", "b", 2),
      message("user", "c", 3),
    ];
    const { page, fetchMock, deleteMessage } = setup(history);

    await act(() => deleteMessage(1));

    const expected = [history[0], history[2]];
    expect(page.userData.chatHistory[1]).toHaveBeenCalledWith(expected);
    expect(fetchMock).toHaveBeenCalledWith(
      "api/chats",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      id: "chat-7",
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
    const { page, deleteMessage } = setup(history);

    await act(() => deleteMessage(1));

    expect(page.userData.chatHistory[1]).toHaveBeenCalledWith([
      history[0],
      history[2],
      history[3],
    ]);
  });

  it("does not modify the original history", async () => {
    const history = [message("user", "a", 1), message("model", "b", 2)];
    const snapshot = structuredClone(history);
    const { deleteMessage } = setup(history);
    await act(() => deleteMessage(0));
    expect(history).toEqual(snapshot);
  });

  it("ignores an index that does not exist", async () => {
    const { page, fetchMock, deleteMessage } = setup([message("user", "a", 1)]);
    await act(() => deleteMessage(5));
    expect(page.userData.chatHistory[1]).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
