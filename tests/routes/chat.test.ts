import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { candidate, geminiStream, readJsonChunks } from "../helpers/stream";
import { jsonRequest, unauthorized } from "../helpers/request";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  getChat: vi.fn(),
  setMessages: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("@/app/api/utils/verify", () => ({ default: mocks.verifyUser }));
vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/models/user", () => ({ default: {} }));
vi.mock("@/actions/chatActions", () => ({ getChat: mocks.getChat, setMessages: mocks.setMessages }));
vi.mock("@/actions/panchang", () => ({ default: () => "### Today's Panchanga:\n- Tithi: TestTithi" }));
vi.mock("@tavily/core", () => ({ tavily: () => ({}) }));
vi.mock("@google/genai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = { generateContentStream: mocks.generate };
  },
}));

import { POST } from "@/app/api/chat/route";
import fetchStream from "@/utils/fetch";

const user = { id: "user-1", name: "Shivam", memories: ["Likes the Gita"], preferredLocale: "hi" };
const savedChat = {
  id: "user-1",
  chatId: "chat-1",
  messages: [
    { role: "user", parts: [{ text: "Who is Arjuna?" }] },
    { role: "model", parts: [{ text: "A Pandava prince." }] },
  ],
};
const body = (overrides: object = {}) => ({
  id: "chat-1",
  newMessage: { role: "user", parts: [{ text: "And Krishna?" }] },
  ...overrides,
});
const send = (payload: unknown) => POST(jsonRequest("/api/chat", "POST", payload) as never);

beforeEach(() => {
  mocks.verifyUser.mockReset().mockResolvedValue(user);
  mocks.getChat.mockReset().mockResolvedValue(savedChat);
  mocks.setMessages.mockReset().mockResolvedValue(undefined);
  mocks.generate.mockReset().mockImplementation(async () => geminiStream([candidate({ text: "Krishna is the charioteer." })]));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/chat: access control", () => {
  it("answers 401 without a session and never calls Gemini", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    const res = await send(body());
    expect(res.status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("loads the chat for the session's user, so nobody can read another user's chat", async () => {
    await send(body());
    expect(mocks.getChat).toHaveBeenCalledWith("user-1", "chat-1");
  });

  it("passes on 'chat does not exist' without calling Gemini", async () => {
    mocks.getChat.mockResolvedValue(() => NextResponse.json({ error: "Chat does not exist" }, { status: 400 }));
    const res = await send(body({ id: "someone-elses" }));
    expect(res.status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat: validation", () => {
  it.each([
    ["no chat id", { newMessage: body().newMessage }],
    ["no message", { id: "chat-1" }],
    ["a message pretending to be from the model", body({ newMessage: { role: "model", parts: [{ text: "x" }] } })],
  ])("rejects a request with %s", async (_label, payload) => {
    const res = await send(payload);
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects an empty chat id", async () => {
    const res = await send(body({ id: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No chat id provided" });
  });

  it("answers with an error, not a stream, for a body that is not JSON", async () => {
    const res = await send("{broken");
    expect(res.ok).toBe(false);
    expect(typeof (await res.json()).error).toBe("string");
  });
});

describe("POST /api/chat: talking to Gemini", () => {
  it("streams the reply as server-sent events", async () => {
    const res = await send(body());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");

    const chunks = await readJsonChunks(res.body!);
    expect(chunks).toEqual([{ content: { role: "model", parts: [{ text: "Krishna is the charioteer." }] } }]);
  });

  it("sends the saved conversation plus the new message to the default model", async () => {
    await readJsonChunks((await send(body())).body!);

    const request = mocks.generate.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.6-flash");
    expect(request.contents).toEqual([
      { role: "user", parts: [{ text: "Who is Arjuna?" }] },
      { role: "model", parts: [{ text: "A Pandava prince." }] },
      { role: "user", parts: [{ text: "And Krishna?" }] },
    ]);
  });

  it("builds the persona from the signed-in user's name, language and memories", async () => {
    await readJsonChunks((await send(body())).body!);

    const instruction = mocks.generate.mock.calls[0][0].config.systemInstruction as string;
    expect(instruction).toContain("You can call user Shivam");
    expect(instruction).toContain("preferred language is: Hindi");
    expect(instruction).toContain("Likes the Gita");
    expect(instruction).toContain("TestTithi");
  });

  it("offers Gemini the web and memory tools", async () => {
    await readJsonChunks((await send(body())).body!);
    const tools = mocks.generate.mock.calls[0][0].config.tools[0].functionDeclarations;
    expect(tools.map((tool: { name: string }) => tool.name)).toEqual([
      "web_search",
      "web_fetch",
      "set_memory",
      "delete_memory",
    ]);
  });

  it("saves the finished conversation to the session user's chat", async () => {
    await readJsonChunks((await send(body())).body!);

    expect(mocks.setMessages).toHaveBeenCalledWith("user-1", "chat-1", [
      { role: "user", parts: [{ text: "Who is Arjuna?" }] },
      { role: "model", parts: [{ text: "A Pandava prince." }] },
      { role: "user", parts: [{ text: "And Krishna?" }] },
      { role: "model", parts: [{ text: "Krishna is the charioteer." }] },
    ]);
  });

  it("attaches files to the message it sends to Gemini", async () => {
    const attachment = { text: "", inlineData: { data: "aGk=", mimeType: "text/plain" } };
    await readJsonChunks(
      (await send(body({ newMessage: { role: "user", parts: [{ text: "Summarise" }, attachment] } }))).body!,
    );
    expect(mocks.generate.mock.calls[0][0].contents.at(-1).parts).toEqual([{ text: "Summarise" }, attachment]);
  });

  it("reports a Gemini failure inside the stream and does not save", async () => {
    mocks.generate.mockRejectedValue(new Error("quota exceeded"));
    const res = await send(body());
    expect(res.status).toBe(200);
    expect(await readJsonChunks(res.body!)).toEqual([{ error: "quota exceeded" }]);
    expect(mocks.setMessages).not.toHaveBeenCalled();
  });

  // Regression test for a bug that has been fixed (see CHANGELOG).
  it("forwards the Deep Think level the browser asked for", async () => {
    await readJsonChunks(
      (await send(body({ config: { config: { thinkingConfig: { thinkingLevel: "HIGH" } } } }))).body!,
    );
    expect(mocks.generate.mock.calls[0][0].config.thinkingConfig).toBeDefined();
  });
});

describe("POST /api/chat: contract with the browser", () => {
  it("is readable by the same stream parser the browser uses", async () => {
    mocks.generate.mockImplementation(async () =>
      geminiStream([
        candidate({ text: "ॐ " }),
        candidate({ text: "नमः " }),
        candidate({ text: 'शिवाय "{ok}"' }),
      ]),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(await send(body())));

    let text = "";
    for await (const chunk of fetchStream("api/chat", { method: "POST" })) {
      for (const part of chunk.content.parts) text += part.text;
    }

    expect(text).toBe('ॐ नमः शिवाय "{ok}"');
  });
});
