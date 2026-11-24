import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, unauthorized } from "../helpers/request";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  getChat: vi.fn(),
  createNewChat: vi.fn(),
  updateChat: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/app/api/utils/verify", () => ({ default: mocks.verifyUser }));
vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/models/user", () => ({ default: {} }));
vi.mock("@/app/api/models/chat", () => ({
  default: { find: mocks.find, findOne: mocks.findOne, deleteOne: mocks.deleteOne },
}));
vi.mock("@/actions/chatActions", () => ({
  getChat: mocks.getChat,
  createNewChat: mocks.createNewChat,
  updateChat: mocks.updateChat,
}));

import { GET, POST } from "@/app/api/chats/route";
import { DELETE, GET as GETChat, PUT } from "@/app/api/chats/[chatId]/route";

const user = { id: "user-1" };
const notFound = () => NextResponse.json({ error: "Chat does not exist" }, { status: 400 });
const chain = (rows: unknown) => ({ select: () => ({ lean: async () => rows }) });

beforeEach(() => {
  mocks.verifyUser.mockReset().mockResolvedValue(user);
  mocks.getChat.mockReset();
  mocks.createNewChat.mockReset();
  mocks.updateChat.mockReset().mockResolvedValue(undefined);
  mocks.find.mockReset();
  mocks.findOne.mockReset();
  mocks.deleteOne.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("GET /api/chats (sidebar list)", () => {
  it("lists only the signed-in user's chats, without their messages", async () => {
    mocks.find.mockReturnValue(
      chain([
        { title: "Karma", chatId: "c1", timestamp: 1, _id: "x", messages: ["secret"] },
        { title: "Gita", chatId: "c2", timestamp: 2 },
      ]),
    );

    const res = await GET();

    expect(mocks.find).toHaveBeenCalledWith({ id: "user-1" });
    expect(await res.json()).toEqual([
      { title: "Karma", id: "c1" },
      { title: "Gita", id: "c2" },
    ]);
  });

  it("creates a first chat for a user who has none", async () => {
    mocks.find.mockReturnValue(chain([]));
    mocks.createNewChat.mockResolvedValue({ title: "New Chat", chatId: "fresh" });

    const res = await GET();

    expect(mocks.createNewChat).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual([{ title: "New Chat", id: "fresh" }]);
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await GET()).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("answers with an error instead of crashing when the database fails", async () => {
    mocks.find.mockImplementation(() => {
      throw new Error("mongo down");
    });
    const res = await GET();
    expect(res.status).toBe(400);
  });
});

describe("POST /api/chats (open a chat)", () => {
  const stored = (messages: unknown[]) => ({
    id: "user-1",
    chatId: "c1",
    title: "Karma",
    timestamp: 1,
    messages,
  });

  it("returns the chat with its messages", async () => {
    const messages = [{ role: "user", parts: [{ text: "hi" }] }];
    mocks.getChat.mockResolvedValue(stored(messages));

    const res = await GETChat(jsonRequest("/api/chats/c1", "GET"), { params: Promise.resolve({ chatId: "c1" }) });

    expect(mocks.getChat).toHaveBeenCalledWith("user-1", "c1");
    const body = await res.json();
    expect(body).toMatchObject({ chatId: "c1", title: "Karma", messages });
  });

  it("marks the chat as just used", async () => {
    mocks.getChat.mockResolvedValue(stored([{ role: "user", parts: [{ text: "hi" }] }]));
    const before = Date.now();

    const res = await GETChat(jsonRequest("/api/chats/c1", "GET"), { params: Promise.resolve({ chatId: "c1" }) });

    const { timestamp } = await res.json();
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(mocks.updateChat).toHaveBeenCalledWith("user-1", "c1", { timestamp });
  });

  it("empties a chat whose messages hold no text at all", async () => {
    mocks.getChat.mockResolvedValue(stored([{ role: "user", parts: [{}] }]));

    const res = await GETChat(jsonRequest("/api/chats/c1", "GET"), { params: Promise.resolve({ chatId: "c1" }) });

    expect((await res.json()).messages).toEqual([]);
    expect(mocks.updateChat).toHaveBeenCalledWith("user-1", "c1", { messages: [] });
  });

  it("passes on 'chat does not exist'", async () => {
    mocks.getChat.mockResolvedValue(notFound);
    const res = await GETChat(jsonRequest("/api/chats/nope", "POST"), { params: Promise.resolve({ chatId: "nope" }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Chat does not exist" });
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await GETChat(jsonRequest("/api/chats/c1", "GET"), { params: Promise.resolve({ chatId: "c1" }) })).status).toBe(401);
  });
});

describe("PATCH /api/chats (new chat)", () => {
  it("re-uses the empty chat the user already has instead of piling up blank ones", async () => {
    mocks.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ chatId: "blank" }) }) });

    const res = await POST();

    expect(mocks.findOne).toHaveBeenCalledWith({ messages: [], id: "user-1" });
    expect(await res.json()).toEqual({ id: "blank" });
    expect(mocks.createNewChat).not.toHaveBeenCalled();
  });

  it("creates a chat when every existing one has messages", async () => {
    mocks.findOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
    mocks.createNewChat.mockResolvedValue({ chatId: "brand-new" });

    const res = await POST();

    expect(mocks.createNewChat).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual({ id: "brand-new" });
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await POST()).status).toBe(401);
  });
});

describe("DELETE /api/chats", () => {
  it("deletes a chat, but only if it belongs to the signed-in user", async () => {
    mocks.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const res = await DELETE(jsonRequest("/api/chats/c1", "DELETE"), { params: Promise.resolve({ chatId: "c1" }) });

    expect(mocks.deleteOne).toHaveBeenCalledWith({ id: "user-1", chatId: "c1" });
    expect(await res.json()).toEqual({ message: "Done" });
  });

  it("reports a chat that does not exist (or belongs to someone else)", async () => {
    mocks.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const res = await DELETE(jsonRequest("/api/chats/someone-elses", "DELETE"), { params: Promise.resolve({ chatId: "someone-elses" }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Chat not found" });
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    const res = await DELETE(jsonRequest("/api/chats/c1", "DELETE"), { params: Promise.resolve({ chatId: "c1" }) });
    expect(res.status).toBe(401);
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });
});

describe("PUT /api/chats (save changes)", () => {
  const messages = [
    { role: "user", parts: [{ text: "hi" }] },
    { role: "model", parts: [{ text: "hello" }] },
  ];
  const put = (chatId: string, body: unknown) => PUT(jsonRequest("/api/chats", "PUT", body), { params: Promise.resolve({ chatId }) });

  it("saves the messages of the signed-in user's chat", async () => {
    const res = await put("c1", { messages });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Done" });
    expect(mocks.updateChat).toHaveBeenCalledWith("user-1", "c1", { messages });
  });

  it("also accepts a title and timestamp alongside the messages", async () => {
    await put("c1", { messages, title: "Karma", timestamp: 99 });
    expect(mocks.updateChat).toHaveBeenCalledWith("user-1", "c1", { messages, title: "Karma", timestamp: 99 });
  });

  it("always acts on the session's user, never a user named in the body", async () => {
    await put("c1", { messages, userId: "victim", user: "victim" });
    expect(mocks.updateChat.mock.calls[0][0]).toBe("user-1");
    expect(mocks.updateChat.mock.calls[0][2]).not.toHaveProperty("userId");
  });

  it("drops fields that are not part of the update", async () => {
    await put("c1", { messages, chatId: "hijack", $set: { id: "victim" } });
    expect(mocks.updateChat.mock.calls[0][2]).toEqual({ messages });
  });

  it("rejects an update that changes nothing", async () => {
    const res = await put("c1", {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No modifications!!" });
  });

  it("rejects malformed messages", async () => {
    const res = await put("c1", { messages: [{ role: "system", parts: [] }] });
    expect(res.status).toBe(400);
    expect(mocks.updateChat).not.toHaveBeenCalled();
  });

  it("passes on 'chat does not exist'", async () => {
    mocks.updateChat.mockResolvedValue(notFound);
    const res = await put("nope", { messages });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Chat does not exist" });
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await put("c1", { messages })).status).toBe(401);
    expect(mocks.updateChat).not.toHaveBeenCalled();
  });
});
