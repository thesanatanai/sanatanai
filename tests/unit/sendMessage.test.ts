import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchStream: vi.fn() }));
vi.mock("@/utils/fetch", () => ({ default: mocks.fetchStream }));

import Incoming from "@/app/api/models/chatModel";
import sendMessage from "@/utils/message";

const message = { role: "user", index: 0, parts: [{ text: "hello" }] } as ChatHistory[0];

async function* chunks(...items: unknown[]) {
  for (const item of items) yield item;
}
const textChunk = (text: string) => ({ content: { parts: [{ text }] } });

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.fetchStream.mockReset();
});

describe("sendMessage", () => {
  it("reports the growing answer and then the finished one", async () => {
    mocks.fetchStream.mockReturnValue(chunks(textChunk("Jai "), textChunk("Shri "), textChunk("Ram")));
    const onUpdate = vi.fn();
    const onFinish = vi.fn();

    const failed = await sendMessage(message, "chat-1", false, onUpdate, onFinish);

    expect(failed).toBeUndefined();
    expect(onUpdate.mock.calls.map(([text]) => text)).toEqual(["Jai ", "Jai Shri ", "Jai Shri Ram"]);
    expect(onFinish).toHaveBeenCalledWith("Jai Shri Ram");
  });

  it("ignores parts without text", async () => {
    mocks.fetchStream.mockReturnValue(
      chunks({ content: { parts: [{ inlineData: {} }] } }, { content: { parts: [] } }, textChunk("ok")),
    );
    const onUpdate = vi.fn();
    await sendMessage(message, "chat-1", false, onUpdate);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("ok");
  });

  it("works without an onFinish callback", async () => {
    mocks.fetchStream.mockReturnValue(chunks(textChunk("hi")));
    await expect(sendMessage(message, "chat-1", false, vi.fn())).resolves.toBeUndefined();
  });

  it("posts the chat id, the message and the thinking level to /api/chat", async () => {
    mocks.fetchStream.mockReturnValue(chunks());
    await sendMessage(message, "chat-42", false, vi.fn());

    const [url, options] = mocks.fetchStream.mock.calls[0];
    expect(url).toBe("api/chat");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body)).toEqual({
      id: "chat-42",
      newMessage: message,
      config: { config: { thinkingConfig: { thinkingLevel: "MEDIUM" } } },
    });
  });

  it("asks for a higher thinking level when Deep Think is on", async () => {
    mocks.fetchStream.mockReturnValue(chunks());
    await sendMessage(message, "chat-1", true, vi.fn());
    const body = JSON.parse(mocks.fetchStream.mock.calls[0][1].body);
    expect(body.config.config.thinkingConfig.thinkingLevel).toBe("HIGH");
  });

  it("sends a payload the server's schema accepts, with the thinking level intact", async () => {
    mocks.fetchStream.mockReturnValue(chunks());
    await sendMessage(message, "chat-1", true, vi.fn());
    const parsed = Incoming.parse(JSON.parse(mocks.fetchStream.mock.calls[0][1].body));
    expect(parsed.config?.config?.thinkingConfig?.thinkingLevel).toBe("HIGH");
  });

  it("returns true when the server streams an error", async () => {
    mocks.fetchStream.mockReturnValue(chunks(textChunk("partial"), { error: "quota exceeded" }));
    const onFinish = vi.fn();
    expect(await sendMessage(message, "chat-1", false, vi.fn(), onFinish)).toBe(true);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("returns true when reading the stream fails", async () => {
    mocks.fetchStream.mockReturnValue(
      (async function* () {
        yield textChunk("partial");
        throw new Error("network dropped");
      })(),
    );
    expect(await sendMessage(message, "chat-1", false, vi.fn())).toBe(true);
  });

  it("returns true when the request is aborted", async () => {
    mocks.fetchStream.mockReturnValue(
      (async function* () {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      })(),
    );
    expect(await sendMessage(message, "chat-1", false, vi.fn())).toBe(true);
  });

  it("returns true when the request cannot even be started", async () => {
    mocks.fetchStream.mockImplementation(() => {
      throw new Error("bad url");
    });
    expect(await sendMessage(message, "chat-1", false, vi.fn())).toBe(true);
  });

  it("cancels the previous request when a new message is sent", async () => {
    let firstSignal!: AbortSignal;
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => (releaseFirst = resolve));

    mocks.fetchStream.mockImplementationOnce((_url: string, options: RequestInit) => {
      firstSignal = options.signal!;
      return (async function* () {
        await gate;
        yield textChunk("stale answer");
      })();
    });
    mocks.fetchStream.mockImplementationOnce(() => chunks(textChunk("fresh answer")));

    const firstUpdate = vi.fn();
    const first = sendMessage(message, "chat-1", false, firstUpdate);
    const secondUpdate = vi.fn();
    await sendMessage(message, "chat-1", false, secondUpdate);

    expect(firstSignal.aborted).toBe(true);
    releaseFirst();
    await first;
    expect(firstUpdate).not.toHaveBeenCalled();
    expect(secondUpdate).toHaveBeenCalledWith("fresh answer");
  });
});
