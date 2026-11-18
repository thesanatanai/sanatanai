import type { Content, GoogleGenAI } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { candidate, geminiStream, readJsonChunks } from "../helpers/stream";

const mocks = vi.hoisted(() => ({
  setMessages: vi.fn(),
  runServerTools: vi.fn(),
}));

vi.mock("@/actions/chatActions", () => ({ setMessages: mocks.setMessages }));
vi.mock("@tavily/core", () => ({ tavily: () => ({}) }));
vi.mock("@/app/api/models/user", () => ({ default: {} }));
vi.mock("@/app/api/chat/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/api/chat/search")>()),
  runServerTools: mocks.runServerTools,
}));

const history: Content[] = [{ role: "user", parts: [{ text: "Who is Hanuman?" }] }];
const options = () => ({ model: "gemini-test", contents: structuredClone(history), config: {} });

/** Loads stream.ts fresh so MAX_TOOL_CALLS is read from the current env. */
async function load() {
  vi.resetModules();
  return (await import("@/app/api/chat/stream")).default;
}

/** Fake Gemini client that answers each call with the next prepared stream. */
function fakeAi(...responses: unknown[][]) {
  const generateContentStream = vi.fn();
  for (const chunks of responses) {
    generateContentStream.mockImplementationOnce(async () => geminiStream(chunks));
  }
  return { ai: { models: { generateContentStream } } as unknown as GoogleGenAI, generateContentStream };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.setMessages.mockResolvedValue(undefined);
});

describe("generateStream: a plain answer", () => {
  it("forwards the text as it arrives and saves one model message", async () => {
    const generateStream = await load();
    const { ai } = fakeAi([candidate({ text: "Jai " }), candidate({ text: "Hanuman" })]);

    const chunks = await readJsonChunks(generateStream(options(), ai, "user-1", "chat-1"));

    expect(chunks).toEqual([
      { content: { role: "model", parts: [{ text: "Jai " }] } },
      { content: { role: "model", parts: [{ text: "Hanuman" }] } },
    ]);
    expect(mocks.setMessages).toHaveBeenCalledTimes(1);
    expect(mocks.setMessages).toHaveBeenCalledWith("user-1", "chat-1", [
      ...history,
      { role: "model", parts: [{ text: "Jai Hanuman" }] },
    ]);
  });

  it("sends the history and the tools to Gemini", async () => {
    const generateStream = await load();
    const { ai, generateContentStream } = fakeAi([candidate({ text: "ok" })]);
    await readJsonChunks(generateStream(options(), ai, "user-1", "chat-1"));
    expect(generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-test", contents: history }),
    );
  });

  it("never shows or saves the model's private thoughts", async () => {
    const generateStream = await load();
    const { ai } = fakeAi([
      candidate({ text: "pondering…", thought: true }),
      candidate({ text: "Answer." }),
    ]);

    const chunks = await readJsonChunks(generateStream(options(), ai, "u", "c"));

    expect(JSON.stringify(chunks)).not.toContain("pondering");
    expect(mocks.setMessages.mock.calls[0][2].at(-1)).toEqual({
      role: "model",
      parts: [{ text: "Answer." }],
    });
  });

  it("filters a mixed chunk down to its visible text", async () => {
    const generateStream = await load();
    const { ai } = fakeAi([
      candidate({ text: "hidden", thought: true }, { text: "shown" }),
    ]);
    const chunks = await readJsonChunks<{ content: { parts: unknown[] } }>(
      generateStream(options(), ai, "u", "c"),
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content.parts).toEqual([{ text: "shown" }]);
  });

  it("skips chunks that have no candidate", async () => {
    const generateStream = await load();
    const { ai } = fakeAi([{ usageMetadata: { totalTokenCount: 5 } }, candidate({ text: "hi" })]);
    const chunks = await readJsonChunks(generateStream(options(), ai, "u", "c"));
    expect(chunks).toHaveLength(1);
  });

  it("still saves the user's message when the model says nothing", async () => {
    const generateStream = await load();
    const { ai } = fakeAi([candidate({ text: "" })]);
    await readJsonChunks(generateStream(options(), ai, "u", "c"));
    expect(mocks.setMessages).toHaveBeenCalledWith("u", "c", history);
  });

  it("does not modify the options it was given", async () => {
    const generateStream = await load();
    const opts = options();
    const before = structuredClone(opts);
    const { ai } = fakeAi([candidate({ text: "x" })]);
    await readJsonChunks(generateStream(opts, ai, "u", "c"));
    expect(opts).toEqual(before);
  });
});

describe("generateStream: tool calls", () => {
  const searchCall = {
    functionCall: { id: "call-1", name: "web_search", args: { query: "hanuman" } },
    thoughtSignature: "sig-1",
  };

  it("runs the tool, gives the result to Gemini and continues the answer", async () => {
    const generateStream = await load();
    const toolResponse = {
      functionResponse: { id: "call-1", name: "web_search", response: { output: { answer: "A" } } },
    };
    mocks.runServerTools.mockResolvedValue([toolResponse]);
    const { ai, generateContentStream } = fakeAi(
      [candidate({ text: "Let me look. " }, searchCall)],
      [candidate({ text: "Here is what I found." })],
    );

    const chunks = await readJsonChunks(generateStream(options(), ai, "user-1", "chat-1"));

    // The tool was run for the right user with exactly the model's call.
    expect(mocks.runServerTools).toHaveBeenCalledTimes(1);
    expect(mocks.runServerTools).toHaveBeenCalledWith([searchCall.functionCall], "user-1");

    // Gemini got its own turn back (signature intact) plus the tool result.
    expect(generateContentStream).toHaveBeenCalledTimes(2);
    const secondRequest = generateContentStream.mock.calls[1][0].contents as Content[];
    expect(secondRequest).toEqual([
      ...history,
      { role: "model", parts: [{ text: "Let me look. " }, searchCall] },
      { role: "user", parts: [toolResponse] },
    ]);

    // The browser saw text from both steps but no tool plumbing.
    const shown = chunks.map((c) => (c as { content: { parts: { text?: string }[] } }).content.parts[0].text);
    expect(shown).toEqual(["Let me look. ", "Here is what I found."]);
    expect(JSON.stringify(chunks)).not.toContain("functionCall");

    // Only the visible text is persisted: no function calls or responses.
    expect(mocks.setMessages).toHaveBeenCalledTimes(1);
    expect(mocks.setMessages).toHaveBeenCalledWith("user-1", "chat-1", [
      ...history,
      { role: "model", parts: [{ text: "Let me look. Here is what I found." }] },
    ]);
  });

  it("handles several tool calls requested in one step", async () => {
    const generateStream = await load();
    const calls = [
      { functionCall: { id: "a", name: "web_search", args: { query: "one" } } },
      { functionCall: { id: "b", name: "web_fetch", args: { url: "https://example.com" } } },
    ];
    mocks.runServerTools.mockResolvedValue([{ functionResponse: { id: "a" } }, { functionResponse: { id: "b" } }]);
    const { ai, generateContentStream } = fakeAi([candidate(...calls)], [candidate({ text: "done" })]);

    await readJsonChunks(generateStream(options(), ai, "u", "c"));

    expect(mocks.runServerTools).toHaveBeenCalledWith(
      [calls[0].functionCall, calls[1].functionCall],
      "u",
    );
    const replayed = generateContentStream.mock.calls[1][0].contents.at(-2);
    expect(replayed.parts).toEqual(calls);
  });

  it("stops after MAX_TOOL_CALLS rounds and tells the user", async () => {
    vi.stubEnv("MAX_TOOL_CALLS", "2");
    const generateStream = await load();
    mocks.runServerTools.mockResolvedValue([{ functionResponse: { id: "call-1" } }]);
    // The model never stops asking for tools.
    const { ai, generateContentStream } = fakeAi(
      [candidate(searchCall)],
      [candidate(searchCall)],
      [candidate(searchCall)],
      [candidate(searchCall)],
    );

    const chunks = await readJsonChunks<{ content: { parts: { text: string }[] } }>(
      generateStream(options(), ai, "u", "c"),
    );

    expect(mocks.runServerTools).toHaveBeenCalledTimes(2);
    expect(generateContentStream).toHaveBeenCalledTimes(3);
    expect(chunks.at(-1)!.content.parts[0].text).toContain("Tool Call limit reached");
    // The notice is part of what the user saw, so it is saved too.
    expect(mocks.setMessages.mock.calls[0][2].at(-1).parts[0].text).toContain("Tool Call limit reached");
  });

  it("allows 8 rounds of tools by default", async () => {
    const generateStream = await load();
    mocks.runServerTools.mockResolvedValue([{ functionResponse: { id: "call-1" } }]);
    const endless = Array.from({ length: 12 }, () => [candidate(searchCall)]);
    const { ai, generateContentStream } = fakeAi(...endless);

    await readJsonChunks(generateStream(options(), ai, "u", "c"));

    expect(mocks.runServerTools).toHaveBeenCalledTimes(8);
    expect(generateContentStream).toHaveBeenCalledTimes(9);
  });
});

describe("generateStream: failures", () => {
  it("reports a Gemini error to the browser and closes without saving", async () => {
    const generateStream = await load();
    const generateContentStream = vi.fn().mockRejectedValue(new Error("quota exceeded"));
    const ai = { models: { generateContentStream } } as unknown as GoogleGenAI;

    const chunks = await readJsonChunks(generateStream(options(), ai, "u", "c"));

    expect(chunks).toEqual([{ error: "quota exceeded" }]);
    expect(mocks.setMessages).not.toHaveBeenCalled();
  });

  it("reports an error that happens halfway through the stream", async () => {
    const generateStream = await load();
    async function* broken() {
      yield candidate({ text: "partial" });
      throw new Error("connection reset");
    }
    const ai = {
      models: { generateContentStream: vi.fn().mockResolvedValue(broken()) },
    } as unknown as GoogleGenAI;

    const chunks = await readJsonChunks(generateStream(options(), ai, "u", "c"));

    expect(chunks.at(-1)).toEqual({ error: "connection reset" });
    expect(mocks.setMessages).not.toHaveBeenCalled();
  });

  it("reports a failure to save the conversation", async () => {
    const generateStream = await load();
    mocks.setMessages.mockRejectedValue(new Error("mongo unavailable"));
    const { ai } = fakeAi([candidate({ text: "hello" })]);

    const chunks = await readJsonChunks(generateStream(options(), ai, "u", "c"));

    expect(chunks.at(-1)).toEqual({ error: "mongo unavailable" });
  });
});
