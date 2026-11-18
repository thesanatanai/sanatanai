import type { FunctionCall, Part } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { declaredToolNames } from "../helpers/tools";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  extract: vi.fn(),
  updateOne: vi.fn(),
  findOne: vi.fn(),
}));

vi.mock("@tavily/core", () => ({
  tavily: () => ({ search: mocks.search, extract: mocks.extract }),
}));
vi.mock("@/app/api/models/user", () => ({
  default: { updateOne: mocks.updateOne, findOne: mocks.findOne },
}));

import {
  getMainChat,
  getNewMessage,
  getRequestParams,
  getSender,
  isServerTool,
  mergeParts,
  runServerTools,
} from "@/app/api/chat/search";

const call = (name: string, args?: Record<string, unknown>, id = name): FunctionCall => ({
  id,
  name,
  args,
});

/** Runs one tool call and returns the `response` object Gemini would receive. */
async function runOne(name: string, args?: Record<string, unknown>) {
  const [part] = await runServerTools([call(name, args)], "user-1");
  return part.functionResponse!.response as Record<string, unknown>;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("isServerTool", () => {
  it.each(["web_search", "web_fetch", "set_memory", "delete_memory"])(
    "recognises %s",
    (name) => expect(isServerTool(name)).toBe(true),
  );

  it.each([undefined, "", "unknown_tool", "toString", "constructor", "__proto__", "hasOwnProperty"])(
    "does not treat %j as a tool",
    (name) => expect(isServerTool(name)).toBe(false),
  );
});

describe("runServerTools: web_search", () => {
  it("returns only the fields the model needs", async () => {
    mocks.search.mockResolvedValue({
      answer: "Karma is action.",
      query: "karma",
      responseTime: 1.2,
      images: ["img"],
      requestId: "r1",
      results: [
        {
          title: "Karma",
          url: "https://example.com/karma",
          content: "About karma",
          publishedDate: "2026-01-01",
          score: 0.99,
          rawContent: "ignored",
        },
      ],
    });

    const response = await runOne("web_search", { query: "karma" });

    expect(response).toEqual({
      output: {
        answer: "Karma is action.",
        results: [
          {
            title: "Karma",
            url: "https://example.com/karma",
            content: "About karma",
            publishedDate: "2026-01-01",
          },
        ],
      },
    });
  });

  it("asks Tavily for a basic search with a bounded result count", async () => {
    mocks.search.mockResolvedValue({ answer: "", results: [] });
    await runOne("web_search", { query: "  gita  " });
    expect(mocks.search).toHaveBeenCalledWith("gita", {
      includeAnswer: "basic",
      searchDepth: "basic",
      maxResults: 10,
    });
  });

  it("reports a provider failure to the model instead of throwing", async () => {
    mocks.search.mockRejectedValue(new Error("tavily down"));
    const response = await runOne("web_search", { query: "karma" });
    expect(response.error).toMatch(/unable to search/i);
  });

  it.each([
    ["missing query", {}],
    ["empty query", { query: "" }],
    ["whitespace query", { query: "   " }],
    ["non-string query", { query: 7 }],
    ["oversized query", { query: "x".repeat(401) }],
  ])("rejects %s without calling Tavily", async (_label, args) => {
    const response = await runOne("web_search", args);
    expect(String(response.error)).toMatch(/invalid arguments/i);
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("copes with a model that sends no args at all", async () => {
    const response = await runOne("web_search");
    expect(String(response.error)).toMatch(/invalid arguments/i);
  });
});

describe("runServerTools: web_fetch", () => {
  it("returns the page content", async () => {
    mocks.extract.mockResolvedValue({
      results: [{ url: "https://example.com", title: "Example", rawContent: "hello" }],
      failedResults: [],
    });
    const response = await runOne("web_fetch", { url: "https://example.com" });
    expect(mocks.extract).toHaveBeenCalledWith(["https://example.com"]);
    expect(response).toEqual({
      output: {
        results: [
          { url: "https://example.com", title: "Example", content: "hello", truncated: false },
        ],
        failed: [],
      },
    });
  });

  it("truncates very large pages and says so", async () => {
    mocks.extract.mockResolvedValue({
      results: [{ url: "https://example.com", title: "Big", rawContent: "a".repeat(25_000) }],
      failedResults: [],
    });
    const response = await runOne("web_fetch", { url: "https://example.com" });
    const [page] = (response.output as { results: { content: string; truncated: boolean }[] }).results;
    expect(page.content).toHaveLength(20_000);
    expect(page.truncated).toBe(true);
  });

  it("treats a missing body as empty text", async () => {
    mocks.extract.mockResolvedValue({
      results: [{ url: "https://example.com", title: "Empty" }],
      failedResults: [],
    });
    const response = await runOne("web_fetch", { url: "https://example.com" });
    const [page] = (response.output as { results: { content: string }[] }).results;
    expect(page.content).toBe("");
  });

  it.each([
    "ftp://example.com/file",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "not a url",
    "",
  ])("only opens http(s) URLs, not %j", async (url) => {
    const response = await runOne("web_fetch", { url });
    expect(String(response.error)).toMatch(/invalid arguments/i);
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("reports a provider failure to the model instead of throwing", async () => {
    mocks.extract.mockRejectedValue(new Error("blocked"));
    const response = await runOne("web_fetch", { url: "https://example.com" });
    expect(String(response.error)).toMatch(/unable to open/i);
  });
});

describe("runServerTools: set_memory", () => {
  it("adds a memory atomically while the user still has room", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const response = await runOne("set_memory", { memory: "  Likes the Gita  " });
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { id: "user-1", "memories.49": { $exists: false } },
      { $addToSet: { memories: "Likes the Gita" } },
    );
    expect(response).toEqual({ output: { success: true, alreadyKnown: false } });
  });

  it("reports when the memory was already stored", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 0 });
    const response = await runOne("set_memory", { memory: "Likes the Gita" });
    expect(response).toEqual({ output: { success: true, alreadyKnown: true } });
  });

  it("reports a full memory (or unknown user) as an error", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    const response = await runOne("set_memory", { memory: "One more thing" });
    expect(String(response.error)).toMatch(/memory is full \(limit 50\)/i);
  });

  it.each([
    ["empty", ""],
    ["blank", "   "],
    ["too long", "m".repeat(301)],
  ])("rejects a %s memory without touching the database", async (_l, memory) => {
    const response = await runOne("set_memory", { memory });
    expect(String(response.error)).toMatch(/invalid arguments/i);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("accepts a memory of exactly 300 characters", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const response = await runOne("set_memory", { memory: "m".repeat(300) });
    expect(response).toEqual({ output: { success: true, alreadyKnown: false } });
  });
});

describe("runServerTools: delete_memory", () => {
  /** A one-user fake database that supports exactly what deleteMemory uses. */
  function fakeUser(memories: string[] | undefined) {
    const state = { memories };
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockImplementation(async () =>
        state.memories === undefined ? { memories: undefined } : { memories: [...state.memories] },
      ),
    });
    mocks.updateOne.mockImplementation(async (_filter, update) => {
      state.memories = update.memories;
      return { matchedCount: 1, modifiedCount: 1 };
    });
    return state;
  }

  it("removes the memory at an index and returns what it removed", async () => {
    const state = fakeUser(["a", "b", "c"]);
    const response = await runOne("delete_memory", { index: 1 });
    expect(response).toEqual({ output: { success: true, deleted: "b" } });
    expect(state.memories).toEqual(["a", "c"]);
    expect(mocks.updateOne).toHaveBeenCalledWith({ id: "user-1" }, { memories: ["a", "c"] });
  });

  it("explains an index that is out of range", async () => {
    fakeUser(["a", "b"]);
    const response = await runOne("delete_memory", { index: 2 });
    expect(String(response.error)).toBe("No memory at index 2. There are 2 memories (indexes start at 0).");
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("reports an unknown user", async () => {
    mocks.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    const response = await runOne("delete_memory", { index: 0 });
    expect(response).toEqual({ error: "User not found" });
  });

  it("returns an empty output when the user has no memories field", async () => {
    fakeUser(undefined);
    const response = await runOne("delete_memory", { index: 0 });
    expect(response).toEqual({ output: null });
  });

  it.each([
    ["negative", -1],
    ["fractional", 1.5],
    ["a string", "1"],
    ["missing", undefined],
  ])("rejects an index that is %s", async (_label, index) => {
    const response = await runOne("delete_memory", { index });
    expect(String(response.error)).toMatch(/invalid arguments/i);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("deletes several memories in one step without shifting later indexes", async () => {
    const state = fakeUser(["a", "b", "c", "d"]);
    // The model refers to the list it was shown: delete "a" (0) and "c" (2).
    const parts = await runServerTools(
      [call("delete_memory", { index: 0 }, "first"), call("delete_memory", { index: 2 }, "second")],
      "user-1",
    );
    expect(state.memories).toEqual(["b", "d"]);
    // Responses stay matched to their calls, whatever order they ran in.
    expect(parts.map((p) => p.functionResponse!.id)).toEqual(["first", "second"]);
    expect(parts[0].functionResponse!.response).toEqual({ output: { success: true, deleted: "a" } });
    expect(parts[1].functionResponse!.response).toEqual({ output: { success: true, deleted: "c" } });
  });

  it("runs deletes before additions so a freed slot can be reused", async () => {
    const order: string[] = [];
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockImplementation(async () => {
        order.push("delete");
        return { memories: ["a", "b"] };
      }),
    });
    mocks.updateOne.mockImplementation(async (_filter, update) => {
      if ("$addToSet" in update) order.push("add");
      return { matchedCount: 1, modifiedCount: 1 };
    });
    await runServerTools(
      [call("set_memory", { memory: "new" }), call("delete_memory", { index: 0 })],
      "user-1",
    );
    expect(order.indexOf("delete")).toBeLessThan(order.indexOf("add"));
  });
});

describe("runServerTools: robustness", () => {
  it("answers unknown tools with an error that lists the real ones", async () => {
    const response = await runOne("rm_rf");
    expect(String(response.error)).toContain('Unknown tool "rm_rf"');
    expect(String(response.error)).toContain("web_search, web_fetch, set_memory, delete_memory");
  });

  it("does not crash when a tool throws", async () => {
    mocks.updateOne.mockRejectedValue(new Error("db exploded"));
    const response = await runOne("set_memory", { memory: "x" });
    expect(response).toEqual({ error: "The tool failed. Continue without it." });
  });

  it("returns one functionResponse per call, in call order, keeping ids and names", async () => {
    mocks.search.mockResolvedValue({ answer: "a", results: [] });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const parts = await runServerTools(
      [
        call("web_search", { query: "one" }, "id-1"),
        call("set_memory", { memory: "two" }, "id-2"),
        call("nope", {}, "id-3"),
      ],
      "user-1",
    );
    expect(parts.map((p) => [p.functionResponse!.id, p.functionResponse!.name])).toEqual([
      ["id-1", "web_search"],
      ["id-2", "set_memory"],
      ["id-3", "nope"],
    ]);
  });

  it("returns nothing for no calls", async () => {
    expect(await runServerTools([], "user-1")).toEqual([]);
  });
});

describe("getNewMessage", () => {
  const history = [{ role: "user", parts: [{ text: "hi" }] }];

  it("appends one model message holding all the visible text", () => {
    const next = getNewMessage(history, [{ text: "Hello, " }, { text: "seeker." }]);
    expect(next).toEqual([
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "Hello, seeker." }] },
    ]);
  });

  it("saves nothing extra when the model said nothing", () => {
    expect(getNewMessage(history, [])).toEqual(history);
    expect(getNewMessage(history, [{ text: "" }, {}])).toEqual(history);
  });

  it("does not mutate the history it was given", () => {
    const before = structuredClone(history);
    getNewMessage(history, [{ text: "answer" }]);
    expect(history).toEqual(before);
  });
});

describe("mergeParts", () => {
  it("joins neighbouring plain text and drops empty parts", () => {
    expect(mergeParts([{ text: "a" }, { text: "" }, { text: "b" }, { text: "c" }])).toEqual([
      { text: "abc" },
    ]);
  });

  it("keeps thoughts, signatures, function calls and attachments untouched and in order", () => {
    const parts: Part[] = [
      { text: "before " },
      { text: "thinking", thought: true },
      { text: "after" },
      { text: "signed", thoughtSignature: "sig" },
      { functionCall: { name: "web_search", args: { query: "q" } }, thoughtSignature: "sig2" },
      { inlineData: { data: "aGk=", mimeType: "text/plain" } },
      { text: "tail " },
      { text: "end" },
    ];
    expect(mergeParts(parts)).toEqual(parts.slice(0, 6).concat([{ text: "tail end" }]));
  });

  it("does not mutate its input", () => {
    const parts: Part[] = [{ text: "a" }, { text: "b" }];
    mergeParts(parts);
    expect(parts).toEqual([{ text: "a" }, { text: "b" }]);
  });

  it("returns an empty list for no parts", () => {
    expect(mergeParts([])).toEqual([]);
  });
});

describe("getMainChat", () => {
  const chat = {
    messages: [
      {
        role: "user",
        parts: [
          { text: "look", inlineData: { data: "aGk=", mimeType: "text/plain" }, extra: "dropped" },
          { text: "x", inlineData: { data: "only-data" } },
        ],
      },
      {
        role: "model",
        parts: [{ functionCall: { id: "1", name: "web_search", args: { q: 1 } } }, { functionCall: {} }],
      },
    ],
  };

  it("keeps only role, text, attachments and named function calls", () => {
    const [user, model] = getMainChat(chat as never)!;
    expect(user.parts![0]).toEqual({ text: "look", inlineData: { data: "aGk=", mimeType: "text/plain" }, functionCall: undefined });
    expect(user.parts![1].inlineData).toBeFalsy();
    expect(model.parts![0].functionCall).toEqual({ id: "1", name: "web_search", args: { q: 1 } });
    expect(model.parts![1].functionCall).toBeFalsy();
  });

  it("numbers messages from 1 only when asked to", () => {
    expect(getMainChat(chat as never)!.map((m) => m.index)).toEqual([undefined, undefined]);
    expect(getMainChat(chat as never, true)!.map((m) => m.index)).toEqual([1, 2]);
  });

  it("tolerates chats without messages or parts", () => {
    expect(getMainChat({} as never)).toBeUndefined();
    expect(getMainChat({ messages: [{ role: "user" }] } as never)![0].parts).toBeUndefined();
  });
});

describe("getRequestParams", () => {
  const newMessage = { role: "user", parts: [{ text: "second question" }] };
  const chatWith = (messages: unknown[]) => ({ messages }) as never;

  it("defaults to the main Gemini model and always sends the server tools", () => {
    const options = getRequestParams(chatWith([]), newMessage, undefined, "SYSTEM");
    expect(options.model).toBe("gemini-3.6-flash");
    expect(options.config.systemInstruction).toBe("SYSTEM");
    const names = declaredToolNames(options.config);
    expect(names).toEqual(["web_search", "web_fetch", "set_memory", "delete_memory"]);
  });

  it("lets the request choose another model and pass extra config", () => {
    const options = getRequestParams(
      chatWith([]),
      newMessage,
      { model: "gemini-custom", config: { temperature: 0.2 } },
      "SYSTEM",
    );
    expect(options.model).toBe("gemini-custom");
    expect(options.config.temperature).toBe(0.2);
  });

  it("adds client supplied function declarations before the server ones", () => {
    const options = getRequestParams(
      chatWith([]),
      newMessage,
      { config: { tools: [{ functionDeclarations: [{ name: "client_tool" }] }] } },
      "SYSTEM",
    );
    const names = declaredToolNames(options.config);
    expect(names[0]).toBe("client_tool");
    expect(names).toHaveLength(5);
  });

  it("sends the saved history followed by the new message", () => {
    const options = getRequestParams(
      chatWith([
        { role: "user", parts: [{ text: "first question" }] },
        { role: "model", parts: [{ text: "first answer" }] },
      ]),
      newMessage,
      undefined,
      "SYSTEM",
    );
    expect(options.contents).toEqual([
      { role: "user", parts: [{ text: "first question" }] },
      { role: "model", parts: [{ text: "first answer" }] },
      newMessage,
    ]);
  });

  it("cleans history that Gemini would reject", () => {
    const options = getRequestParams(
      chatWith([
        { role: "user", parts: [{ text: "a" }] },
        { role: "user", parts: [{ text: "b" }] }, // same role twice -> merged
        { role: "model", parts: [{ functionCall: { id: "1", name: "web_search", args: {} } }] }, // no text -> dropped
        { role: "model", parts: [{ text: "" }] }, // empty -> dropped
        { role: "model", parts: [{ text: "answer" }, { inlineData: { data: "aGk=", mimeType: "text/plain" } }] },
      ]),
      newMessage,
      undefined,
      "SYSTEM",
    );
    expect(options.contents).toEqual([
      { role: "user", parts: [{ text: "a" }, { text: "b" }] },
      {
        role: "model",
        parts: [{ text: "answer" }, { inlineData: { data: "aGk=", mimeType: "text/plain" } }],
      },
      newMessage,
    ]);
  });

  it("does not modify the stored chat", () => {
    const chat = chatWith([{ role: "user", parts: [{ text: "a" }] }]);
    const before = structuredClone(chat);
    getRequestParams(chat, newMessage, undefined, "SYSTEM");
    expect(chat).toEqual(before);
  });
});

describe("getSender", () => {
  it("writes the first item of each batch as JSON bytes", () => {
    const enqueue = vi.fn();
    const send = getSender<{ text: string }>({ enqueue } as never);
    send([{ text: "Namaste 🙏" }, { text: "ignored" }]);
    expect(enqueue).toHaveBeenCalledTimes(1);
    const bytes = enqueue.mock.calls[0][0] as Uint8Array;
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({ text: "Namaste 🙏" });
  });
});
