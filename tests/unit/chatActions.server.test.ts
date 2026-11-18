import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  chatFindOne: vi.fn(),
  chatFind: vi.fn(),
  chatUpdateOne: vi.fn(),
  chatCreate: vi.fn(),
  userFindOne: vi.fn(),
}));

vi.mock("@/app/api/models/chat", () => ({
  default: {
    findOne: mocks.chatFindOne,
    find: mocks.chatFind,
    updateOne: mocks.chatUpdateOne,
    create: mocks.chatCreate,
  },
}));
vi.mock("@/app/api/models/user", () => ({ default: { findOne: mocks.userFindOne } }));

import {
  createNewChat,
  getChat,
  getChats,
  setMessages,
  updateChat,
} from "@/actions/chatActions";

/** Calls an error factory and reads its response. */
async function errorOf(result: unknown) {
  expect(typeof result).toBe("function");
  const response = (result as () => Response)();
  return { status: response.status, body: await response.json() };
}
const rows = (items: unknown[]) => ({ select: () => ({ lean: async () => items }) });

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.chatFindOne.mockResolvedValue(null); // no id collisions by default
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getChat", () => {
  it("returns the chat as plain JSON, looked up by owner and chat id", async () => {
    const json = { id: "user-1", chatId: "c1", messages: [] };
    mocks.chatFindOne.mockResolvedValue({ toJSON: () => json });

    expect(await getChat("user-1", "c1")).toBe(json);
    expect(mocks.chatFindOne).toHaveBeenCalledWith({ id: "user-1", chatId: "c1" });
  });

  it("reports a missing chat as a 400", async () => {
    expect(await errorOf(await getChat("user-1", "nope"))).toEqual({
      status: 400,
      body: { error: "Chat does not exist" },
    });
  });

  it("reports a database failure as a 500", async () => {
    mocks.chatFindOne.mockRejectedValue(new Error("mongo down"));
    expect(await errorOf(await getChat("user-1", "c1"))).toEqual({
      status: 500,
      body: { error: "Internal Server Error" },
    });
  });
});

describe("updateChat", () => {
  it("sets the given fields on the user's own chat", async () => {
    mocks.chatUpdateOne.mockResolvedValue({ matchedCount: 1 });

    expect(await updateChat("user-1", "c1", { title: "Karma" })).toBeUndefined();
    expect(mocks.chatUpdateOne).toHaveBeenCalledWith(
      { id: "user-1", chatId: "c1" },
      { $set: { title: "Karma" } },
    );
  });

  it("reports a chat that does not exist (or belongs to someone else)", async () => {
    mocks.chatUpdateOne.mockResolvedValue({ matchedCount: 0 });
    expect((await errorOf(await updateChat("user-1", "c1", { title: "x" }))).status).toBe(400);
  });

  it("reports a database failure as a 500", async () => {
    mocks.chatUpdateOne.mockRejectedValue(new Error("mongo down"));
    expect((await errorOf(await updateChat("user-1", "c1", { title: "x" }))).status).toBe(500);
  });
});

describe("getChats", () => {
  it("lists the user's chats with 1-based positions", async () => {
    mocks.userFindOne.mockResolvedValue({ id: "user-1" });
    mocks.chatFind.mockReturnValue(
      rows([
        { title: "Karma", chatId: "c1", timestamp: 10 },
        { title: "Gita", chatId: "c2", timestamp: 20 },
      ]),
    );

    expect(await getChats("user-1")).toEqual([
      { title: "Karma", id: "c1", timestamp: 10, index: 1 },
      { title: "Gita", id: "c2", timestamp: 20, index: 2 },
    ]);
    expect(mocks.chatFind).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("creates a first chat for a user who has none", async () => {
    mocks.userFindOne.mockResolvedValue({ id: "user-1" });
    mocks.chatFind.mockReturnValue(rows([]));
    mocks.chatCreate.mockResolvedValue({ title: "New Chat", chatId: "fresh", timestamp: 99 });

    expect(await getChats("user-1")).toEqual([{ title: "New Chat", id: "fresh", timestamp: 99, index: 1 }]);
    expect(mocks.chatCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown user", async () => {
    mocks.userFindOne.mockResolvedValue(null);
    expect(await errorOf(await getChats("ghost"))).toEqual({
      status: 400,
      body: { error: "User does not exist.." },
    });
    expect(mocks.chatFind).not.toHaveBeenCalled();
  });

  it("reports a database failure as a 500", async () => {
    mocks.userFindOne.mockRejectedValue(new Error("mongo down"));
    expect((await errorOf(await getChats("user-1"))).status).toBe(500);
  });
});

describe("createNewChat", () => {
  it("creates an empty chat titled 'New Chat' with a unique id", async () => {
    mocks.chatCreate.mockImplementation(async (doc) => doc);
    const before = Date.now();

    const chat = await createNewChat("user-1");

    expect(chat).toMatchObject({ id: "user-1", title: "New Chat", messages: [] });
    expect(chat.chatId).toMatch(/^[0-9a-f]{64}$/);
    expect(chat.timestamp).toBeGreaterThanOrEqual(before);
    expect(mocks.chatFindOne).toHaveBeenCalledWith({ chatId: chat.chatId });
  });

  it("accepts a custom title", async () => {
    mocks.chatCreate.mockImplementation(async (doc) => doc);
    expect((await createNewChat("user-1", "Imported")).title).toBe("Imported");
  });

  it("picks another id when the first one is taken", async () => {
    mocks.chatCreate.mockImplementation(async (doc) => doc);
    mocks.chatFindOne.mockResolvedValueOnce({ chatId: "taken" }).mockResolvedValue(null);

    const chat = await createNewChat("user-1");

    expect(mocks.chatFindOne).toHaveBeenCalledTimes(2);
    expect(chat.chatId).toBe(mocks.chatFindOne.mock.calls[1][0].chatId);
    expect(mocks.chatFindOne.mock.calls[0][0].chatId).not.toBe(chat.chatId);
  });
});

describe("setMessages", () => {
  it("replaces the messages of the user's chat", async () => {
    mocks.chatUpdateOne.mockResolvedValue({ matchedCount: 1 });
    const messages = [{ role: "user", parts: [{ text: "hi" }] }];

    expect(await setMessages("user-1", "c1", messages)).toBeUndefined();
    expect(mocks.chatUpdateOne).toHaveBeenCalledWith({ id: "user-1", chatId: "c1" }, { $set: { messages } });
  });

  it("hands back the error when the chat does not exist", async () => {
    mocks.chatUpdateOne.mockResolvedValue({ matchedCount: 0 });
    expect((await errorOf(await setMessages("user-1", "gone", []))).status).toBe(400);
  });
});
