import { logger } from "./utils";

/**
 * Reads a server-sent-events response and yields the JSON in each `data:` line.
 *
 * Comment lines (`: ping`, the server's keep-alive) and events that are not
 * valid JSON are skipped. Events end at a blank line, and `\n`, `\r\n` and `\r`
 * all count as line breaks, as the SSE format allows.
 *
 * @param response A response whose body is an event stream
 */
export async function* readEvents(response: Response): AsyncGenerator<unknown> {
  if (!response.body) throw new Error("The response has no body to read");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // A "\r" at the very end may be the first half of "\r\n", so it waits.
      const text = buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer;
      const rest = buffer.slice(text.length);
      const events = text.replace(/\r\n?/g, "\n").split("\n\n");
      buffer = (events.pop() ?? "") + rest;

      for (const event of events) {
        const parsed = parseEvent(event);
        if (parsed !== undefined) yield parsed;
      }
    }
    // A stream that ends without the final blank line still delivers its last event.
    const last = parseEvent((buffer + decoder.decode()).replace(/\r\n?/g, "\n"));
    if (last !== undefined) yield last;
  } finally {
    // Stops the download when the caller stops reading early.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function parseEvent(event: string): unknown {
  const data = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!data) return undefined;
  try {
    return JSON.parse(data);
  } catch (error) {
    logger("Skipped an event that is not JSON:", data, error);
    return undefined;
  }
}
