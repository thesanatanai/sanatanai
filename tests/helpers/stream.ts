/**
 * Reads a Response/ReadableStream produced by /api/chat and returns each
 * enqueued chunk parsed from JSON. The server enqueues one complete JSON
 * object per chunk (there are no delimiters), so chunks map 1:1 to objects.
 */
export async function readJsonChunks<T = unknown>(
  stream: ReadableStream<Uint8Array>,
): Promise<T[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: T[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(JSON.parse(decoder.decode(value)) as T);
  }
  return chunks;
}

/** Builds a Gemini-style async stream from a list of chunks. */
export async function* geminiStream<T>(chunks: T[]) {
  for (const chunk of chunks) yield chunk;
}

/** A Gemini streaming chunk with one candidate holding the given parts. */
export const candidate = (...parts: Record<string, unknown>[]) => ({
  candidates: [{ content: { role: "model", parts } }],
});
