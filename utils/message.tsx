import fetchStream from "./fetch";
import { Part } from "@google/genai";
import { logger } from "./utils";

let activeAbortController: AbortController | null = null;
let activeAnimationFrame: number | null = null;

export async function sendMessage(
  message: ChatHistory[0],
  id: string,
  onUpdate: (text: string) => void,
  onFinish?: (text: string) => void,
) {
  // Cancel any active stream or typing animation
  if (activeAbortController) {
    activeAbortController.abort();
  }
  if (activeAnimationFrame !== null) {
    cancelAnimationFrame(activeAnimationFrame);
    activeAnimationFrame = null;
  }

  const abortController = new AbortController();
  activeAbortController = abortController;

  let aiResponse;
  try {
    aiResponse = fetchStream("api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        newMessage: message,
      }),
      signal: abortController.signal,
    });
  } catch (error) {
    logger("Failed to start message stream:", error);
    return true;
  }
  let buffer = "";
  try {
    for await (const chunk of aiResponse) {
      if (abortController.signal.aborted) break;
      if(chunk.error) return true; // Return true to indicate error
      const parts = chunk.content.parts || [];
      parts.forEach((part: Part) => {
        if (!part.text) return;
        buffer += part.text;
        onUpdate(buffer);
      });
    }
    if(onFinish) onFinish(buffer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.name === "AbortError") {
      logger("Fetch stream aborted.");
    } else {
      logger("Error reading fetch stream:", error);
    }
    return true; // Return true to indicate an error occurred
  }
}
