import { streamReply } from "./api";
import { logger } from "./utils";

let activeAbortController: AbortController | null = null;
let activeAnimationFrame: number | null = null;

/**
 * Sends a message and passes on the reply as it is written.
 * @returns true when the reply failed or was stopped, nothing when it finished
 */
export async function sendMessage(
  message: ChatHistory[0],
  id: string,
  deepThink: boolean,
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

  let buffer = "";
  try {
    const reply = streamReply(id, message, deepThink ? "high" : "medium", abortController.signal);
    for await (const event of reply) {
      if (abortController.signal.aborted) break;
      if (event.type === "error") {
        logger("The reply failed:", event.code, event.message);
        return true; // Return true to indicate error
      }
      if (event.type === "text" && event.text) {
        buffer += event.text;
        onUpdate(buffer);
      }
    }
    if (onFinish) onFinish(buffer);
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

export default sendMessage;
