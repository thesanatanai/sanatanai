import { beforeEach, describe, expect, it, vi } from "vitest";
import { readEvents } from "@/utils/sse";

/** A response whose body arrives in the given pieces, however they cut the text. */
function pieces(...chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  );
}
async function collect(response: Response) {
  const events: unknown[] = [];
  for await (const event of readEvents(response)) events.push(event);
  return events;
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("readEvents", () => {
  it("yields the JSON of each data line", async () => {
    const events = await collect(pieces('data: {"type":"text","text":"Om"}\n\ndata: {"type":"done"}\n\n'));
    expect(events).toEqual([{ type: "text", text: "Om" }, { type: "done" }]);
  });

  it("puts together an event that arrives in pieces, even cut inside a word or a character", async () => {
    const whole = 'data: {"type":"text","text":"नमः शिवाय"}\n\n';
    const bytes = new TextEncoder().encode(whole);
    const cut = 30; // inside a multi-byte character
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, cut));
          controller.enqueue(bytes.slice(cut));
          controller.close();
        },
      }),
    );
    expect(await collect(response)).toEqual([{ type: "text", text: "नमः शिवाय" }]);
  });

  it("handles several events in one piece", async () => {
    expect(await collect(pieces('data: {"n":1}\n\ndata: {"n":2}\n\ndata: {"n":3}\n\n'))).toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
    ]);
  });

  it("skips the server's keep-alive comments", async () => {
    expect(await collect(pieces(': ping\n\ndata: {"n":1}\n\n: ping\n\n'))).toEqual([{ n: 1 }]);
  });

  it("accepts \\r\\n line breaks, also when they are split between pieces", async () => {
    expect(await collect(pieces('data: {"n":1}\r', '\n\r\ndata: {"n":2}\r\n\r\n'))).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it("does not need the space after the colon", async () => {
    expect(await collect(pieces('data:{"n":1}\n\n'))).toEqual([{ n: 1 }]);
  });

  it("joins a payload written over several data lines", async () => {
    expect(await collect(pieces('data: {"a":\ndata: 1}\n\n'))).toEqual([{ a: 1 }]);
  });

  it("skips an event that is not JSON and carries on", async () => {
    expect(await collect(pieces('data: not json\n\ndata: {"n":1}\n\n'))).toEqual([{ n: 1 }]);
  });

  it("delivers a last event the server did not end with a blank line", async () => {
    expect(await collect(pieces('data: {"n":1}\n\ndata: {"n":2}'))).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it("ignores other fields such as event: and id:", async () => {
    expect(await collect(pieces('event: message\nid: 7\ndata: {"n":1}\n\n'))).toEqual([{ n: 1 }]);
  });

  it("yields nothing for an empty stream", async () => {
    expect(await collect(pieces())).toEqual([]);
  });

  it("refuses a response without a body", async () => {
    await expect(collect(new Response(null))).rejects.toThrow("no body");
  });

  it("stops downloading when the caller stops reading", async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"n":1}\n\n'));
        },
        cancel() {
          cancelled = true;
        },
      }),
    );
    for await (const event of readEvents(response)) {
      expect(event).toEqual({ n: 1 });
      break;
    }
    expect(cancelled).toBe(true);
  });

  it("does not fail when the stream cannot be cancelled", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"n":1}\n\n'));
        },
        cancel() {
          throw new Error("already gone");
        },
      }),
    );
    for await (const event of readEvents(response)) {
      expect(event).toEqual({ n: 1 });
      break;
    }
  });
});
