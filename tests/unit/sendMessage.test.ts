import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ streamReply: vi.fn() }));
vi.mock("@/utils/api", () => ({ streamReply: mocks.streamReply }));

import sendMessage from "@/utils/message";

const message = { role: "user", index: 0, parts: [{ text: "hello" }] } as ChatHistory[0];

async function* events(...items: unknown[]) {
  for (const item of items) yield item;
}
const text = (value: string) => ({ type: "text", text: value });
const done = { type: "done" };

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.streamReply.mockReset();
});

describe("sendMessage", () => {
  it("reports the growing answer and then the finished one", async () => {
    mocks.streamReply.mockReturnValue(events(text("Jai "), text("Shri "), text("Ram"), done));
    const onUpdate = vi.fn();
    const onFinish = vi.fn();

    const failed = await sendMessage(message, "chat-1", false, onUpdate, onFinish);

    expect(failed).toBeUndefined();
    expect(onUpdate.mock.calls.map(([value]) => value)).toEqual(["Jai ", "Jai Shri ", "Jai Shri Ram"]);
    expect(onFinish).toHaveBeenCalledWith("Jai Shri Ram");
  });

  it("ignores empty text and events that carry no text", async () => {
    mocks.streamReply.mockReturnValue(events(text(""), { type: "unknown" }, text("ok"), done));
    const onUpdate = vi.fn();
    await sendMessage(message, "chat-1", false, onUpdate);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("ok");
  });

  it("works without an onFinish callback", async () => {
    mocks.streamReply.mockReturnValue(events(text("hi"), done));
    await expect(sendMessage(message, "chat-1", false, vi.fn())).resolves.toBeUndefined();
  });

  it("hands the chat id, the message and a medium thinking level to the API client", async () => {
    mocks.streamReply.mockReturnValue(events());
    await sendMessage(message, "chat-42", false, vi.fn());

    const [id, sent, thinking, signal] = mocks.streamReply.mock.calls[0];
    expect(id).toBe("chat-42");
    expect(sent).toBe(message);
    expect(thinking).toBe("medium");
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("asks for a higher thinking level when Deep Think is on", async () => {
    mocks.streamReply.mockReturnValue(events());
    await sendMessage(message, "chat-1", true, vi.fn());
    expect(mocks.streamReply.mock.calls[0][2]).toBe("high");
  });

  it("returns true when the server reports an error in the stream", async () => {
    mocks.streamReply.mockReturnValue(
      events(text("partial"), { type: "error", code: "generation_failed", message: "quota exceeded" }),
    );
    const onFinish = vi.fn();
    expect(await sendMessage(message, "chat-1", false, vi.fn(), onFinish)).toBe(true);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("returns true when reading the stream fails", async () => {
    mocks.streamReply.mockReturnValue(
      (async function* () {
        yield text("partial");
        throw new Error("network dropped");
      })(),
    );
    expect(await sendMessage(message, "chat-1", false, vi.fn())).toBe(true);
  });

  it("returns true when the request is aborted", async () => {
    mocks.streamReply.mockReturnValue(
      (async function* () {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      })(),
    );
    expect(await sendMessage(message, "chat-1", false, vi.fn())).toBe(true);
  });

  it("returns true when the API refuses the request before any text", async () => {
    mocks.streamReply.mockImplementation(async function* () {
      throw Object.assign(new Error("Not signed in"), { status: 401 });
    });
    expect(await sendMessage(message, "chat-1", false, vi.fn())).toBe(true);
  });

  it("cancels the previous request when a new message is sent", async () => {
    let firstSignal!: AbortSignal;
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => (releaseFirst = resolve));

    mocks.streamReply.mockImplementationOnce((_id: string, _message: unknown, _level: string, signal: AbortSignal) => {
      firstSignal = signal;
      return (async function* () {
        await gate;
        yield text("stale answer");
      })();
    });
    mocks.streamReply.mockImplementationOnce(() => events(text("fresh answer"), done));

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
