import { logger } from "./utils";

export default async function* fetchStream(
  url: string,
  requestOptions: RequestInit = {},
): AsyncGenerator<ReturnType<typeof JSON.parse>> {
  let response;
  try {
    response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const reader = (
      response.body as NonNullable<typeof response.body>
    ).getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let startIndex = 0;
        let braceCount = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          if (escaped) {
            escaped = false;
            continue;
          }
          if (char === "\\") {
            escaped = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") {
              if (braceCount === 0) {
                startIndex = i;
              }
              braceCount++;
            } else if (char === "}") {
              braceCount--;
              if (braceCount === 0) {
                const jsonStr = buffer.slice(startIndex, i + 1);
                try {
                  yield JSON.parse(jsonStr);
                } catch (e) {
                  logger("Failed to parse JSON chunk:", jsonStr, e);
                }
                startIndex = i + 1;
              }
            }
          }
        }
        buffer = buffer.slice(startIndex);
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    logger(`[${url}] Fetch error:`, error);
    throw error;
  }
}
