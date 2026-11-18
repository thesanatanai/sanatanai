import { beforeEach, describe, expect, it, vi } from "vitest";
import fetchStream from "@/utils/fetch";

const encoder = new TextEncoder();

/** A fetch() stand-in that streams the given byte chunks. */
function stubFetch(chunks: (string | Uint8Array)[], init: ResponseInit = { status: 200 }) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function collect(url = "api/chat", options?: RequestInit) {
  const out: unknown[] = [];
  for await (const item of fetchStream(url, options)) out.push(item);
  return out;
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("fetchStream", () => {
  it("yields one object per JSON document", async () => {
    stubFetch(['{"a":1}']);
    expect(await collect()).toEqual([{ a: 1 }]);
  });

  it("yields several objects that arrive in a single chunk", async () => {
    stubFetch(['{"a":1}{"b":2}{"c":3}']);
    expect(await collect()).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("yields several objects that arrive in separate chunks", async () => {
    stubFetch(['{"a":1}', '{"b":2}']);
    expect(await collect()).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("reassembles an object split across chunks", async () => {
    stubFetch(['{"content":{"par', 'ts":[{"text":"Nam', 'aste"}]}}']);
    expect(await collect()).toEqual([{ content: { parts: [{ text: "Namaste" }] } }]);
  });

  it("reassembles the same payload no matter where the network splits it", async () => {
    const payload = '{"a":{"b":[1,2,{"c":"x"}]}}{"d":"y"}{"e":[]}';
    const expected = [{ a: { b: [1, 2, { c: "x" }] } }, { d: "y" }, { e: [] }];
    for (let split = 1; split < payload.length; split++) {
      stubFetch([payload.slice(0, split), payload.slice(split)]);
      expect(await collect(), `split at ${split}`).toEqual(expected);
    }
  });

  it("ignores braces that appear inside strings", async () => {
    stubFetch(['{"text":"function () { return }"}{"text":"}}}{{{"}']);
    expect(await collect()).toEqual([{ text: "function () { return }" }, { text: "}}}{{{" }]);
  });

  it("handles escaped quotes and backslashes inside strings", async () => {
    stubFetch(['{"text":"she said \\"{hi}\\""}{"path":"C:\\\\dir\\\\"}']);
    expect(await collect()).toEqual([{ text: 'she said "{hi}"' }, { path: "C:\\dir\\" }]);
  });

  it("decodes multi-byte characters that are split between chunks", async () => {
    // "ॐ" is three bytes in UTF-8; cut the stream in the middle of it.
    const bytes = encoder.encode('{"text":"ॐ नमः शिवाय"}');
    const cut = bytes.indexOf(0xe0) + 1;
    stubFetch([bytes.slice(0, cut), bytes.slice(cut)]);
    expect(await collect()).toEqual([{ text: "ॐ नमः शिवाय" }]);
  });

  it("skips a malformed document and keeps going", async () => {
    stubFetch(['{"a":1}{not json}{"b":2}']);
    expect(await collect()).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("yields nothing for an empty body", async () => {
    stubFetch([]);
    expect(await collect()).toEqual([]);
  });

  it("passes the URL and request options to fetch", async () => {
    const fetchMock = stubFetch(['{"ok":true}']);
    const controller = new AbortController();
    const options = { method: "POST", body: "{}", signal: controller.signal };
    await collect("api/chat", options);
    expect(fetchMock).toHaveBeenCalledWith("api/chat", options);
  });

  it("throws on an HTTP error status", async () => {
    stubFetch(['{"error":"nope"}'], { status: 500 });
    await expect(collect()).rejects.toThrow("HTTP error! status: 500");
  });

  it("propagates a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(collect()).rejects.toThrow("Failed to fetch");
  });

  it("releases the reader when the consumer stops early", async () => {
    const fetchMock = stubFetch(['{"a":1}{"b":2}']);
    for await (const item of fetchStream("api/chat")) {
      expect(item).toEqual({ a: 1 });
      break;
    }
    const response = (await fetchMock.mock.results[0].value) as Response;
    expect(response.body!.locked).toBe(false);
  });
});
