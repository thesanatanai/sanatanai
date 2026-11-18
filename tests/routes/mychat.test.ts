import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, unauthorized } from "../helpers/request";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  generateContent: vi.fn(),
  updateChat: vi.fn(),
}));

vi.mock("@/app/api/utils/verify", () => ({ default: mocks.verifyUser }));
vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/models/user", () => ({ default: {} }));
vi.mock("@/actions/chatActions", () => ({ updateChat: mocks.updateChat }));
vi.mock("@google/genai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = { generateContent: mocks.generateContent };
  },
}));

import { POST as nameChat } from "@/app/api/chat/name/route";
import { POST as enhance } from "@/app/api/chat/v2/route";

const user = { id: "user-1", name: "Shivam", preferredLocale: "en" };

beforeEach(() => {
  mocks.verifyUser.mockReset().mockResolvedValue(user);
  mocks.generateContent.mockReset().mockResolvedValue({ text: "Krishna on Karma" });
  mocks.updateChat.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("POST /api/chat/name (chat titles)", () => {
  const name = (payload: unknown) => nameChat(jsonRequest("/api/chat/name", "POST", payload) as never);

  it("asks a small model for a short title and returns it", async () => {
    const res = await name({ newMessage: "What does Krishna say about karma?", chatId: "chat-1" });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(await res.text()).toBe("Krishna on Karma");

    const request = mocks.generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.5-flash-lite");
    expect(request.contents.text).toBe("What does Krishna say about karma?");
    expect(request.config.systemInstruction).toContain("Chat Name Generator");
  });

  it("saves the title on the session user's chat", async () => {
    await name({ newMessage: "hi", chatId: "chat-1" });
    expect(mocks.updateChat).toHaveBeenCalledWith("user-1", "chat-1", { title: "Krishna on Karma" });
  });

  it("does not overwrite the title when the model returns nothing", async () => {
    mocks.generateContent.mockResolvedValue({ text: undefined });
    const res = await name({ newMessage: "hi", chatId: "chat-1" });
    expect(res.status).toBe(200);
    expect(mocks.updateChat).not.toHaveBeenCalled();
  });

  it("still returns the title if saving it fails", async () => {
    mocks.updateChat.mockResolvedValue(() => Response.json({ error: "Chat does not exist" }, { status: 400 }));
    const res = await name({ newMessage: "hi", chatId: "gone" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Krishna on Karma");
  });

  it.each([{}, { newMessage: "hi" }, { chatId: "chat-1" }, { newMessage: 1, chatId: "c" }])(
    "rejects the invalid request %j",
    async (payload) => {
      const res = await name(payload);
      expect(res.status).toBe(400);
      expect(mocks.generateContent).not.toHaveBeenCalled();
    },
  );

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await name({ newMessage: "hi", chatId: "c" })).status).toBe(401);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("answers 500 when Gemini fails", async () => {
    mocks.generateContent.mockRejectedValue(new Error("quota"));
    const res = await name({ newMessage: "hi", chatId: "c" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/something went wrong/i);
  });
});

describe("POST /api/chat/v2 (prompt enhancement)", () => {
  const enhanceIt = (payload: unknown) => enhance(jsonRequest("/api/chat/v2", "POST", payload) as never);

  it("rewrites a rough message into a better query", async () => {
    mocks.generateContent.mockResolvedValue({ text: "What is karma in Sanatan Dharma?" });
    const res = await enhanceIt({ newMessage: "tell me about karma" });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(await res.text()).toBe("What is karma in Sanatan Dharma?");

    const request = mocks.generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.1-flash-lite");
    expect(request.contents.text).toBe("tell me about karma");
  });

  it("tells the model the user's name and language", async () => {
    await enhanceIt({ newMessage: "hi" });
    const instruction = mocks.generateContent.mock.calls[0][0].config.systemInstruction as string;
    expect(instruction).toContain("Name of user is **Shivam**");
    expect(instruction).toContain("**Preferred language:** English");
  });

  it("rejects a request without a message", async () => {
    const res = await enhanceIt({});
    expect(res.status).toBe(400);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await enhanceIt({ newMessage: "hi" })).status).toBe(401);
  });

  it("answers 500 when Gemini fails", async () => {
    mocks.generateContent.mockRejectedValue(new Error("quota"));
    expect((await enhanceIt({ newMessage: "hi" })).status).toBe(500);
  });
});
