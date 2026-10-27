/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Candidate, GoogleGenAI, Part } from "@google/genai";
import {
  getNewMessage,
  getSender,
  mergeParts,
  requestOptions,
  runServerTools,
} from "./search";
import { setMessages } from "@/actions/chatActions";

// Hard cap on chained tool calls per user turn. Without this, a model that
// keeps requesting tool calls back to back would hold the connection open
// forever and burn unbounded Gemini/Tavily quota on a single message.
const MAX_TOOL_CALL_STEPS = Number(process.env.MAX_TOOL_CALLS || 8);

export default function generateStream(
  requestOptions: requestOptions,
  ai: GoogleGenAI,
  userID: string,
  chatID: string,
) {
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    async start(controller) {
      const sendToFrontend = getSender<Candidate | { error: string }>(
        controller,
      );

      // Two separate lists, on purpose:
      //  - savedContents: what goes to the database (history + this user
      //    message, later + ONE model message with the visible text).
      //  - workingContents: what goes to Gemini. It also receives the tool
      //    turns (functionCall / functionResponse) of THIS request only.
      const savedContents = [...requestOptions.contents];
      const workingContents = [...requestOptions.contents];

      // Every piece of answer text the user saw, across all tool steps.
      const visibleParts: Part[] = [];
      const save = () =>
        setMessages(userID, chatID, getNewMessage(savedContents, visibleParts));

      async function runTurn(depth: number): Promise<void> {
        const result = await ai.models.generateContentStream({
          ...requestOptions,
          contents: workingContents,
        });

        // Exactly what the model returned in this step, in order. Gemini 3
        // needs its functionCall parts (with thoughtSignature) replayed.
        const modelParts: Part[] = [];

        for await (const chunk of result) {
          const candidate = chunk.candidates?.[0];
          if (!candidate) continue;

          const parts = candidate.content?.parts ?? [];
          modelParts.push(...parts);

          // The browser only gets the answer text: no tool calls, no thoughts.
          const shown = parts.filter((p) => !p.thought && !p.functionCall);
          for (const p of shown) {
            if (p.text) visibleParts.push({ text: p.text });
          }

          if (shown.length === parts.length) {
            sendToFrontend([candidate]);
          } else if (shown.length) {
            sendToFrontend([
              {
                ...candidate,
                content: { ...candidate.content, parts: shown },
              },
            ]);
          }
        }

        const calls = modelParts
          .filter((p) => p.functionCall)
          .map((p) => p.functionCall!);

        // No tool call: this is the final answer. Save it and finish.
        if (!calls.length) return void (await save());

        if (depth >= MAX_TOOL_CALL_STEPS) {
          const notice = "\n\nSorry! Tool Call limit reached";
          sendToFrontend([{ content: { parts: [{ text: notice }] } }]);
          visibleParts.push({ text: notice });
          return void (await save());
        }

        // Run the tools, then give Gemini the model's own turn (with the
        // functionCall parts) followed by the matching functionResponse parts.
        const responses = await runServerTools(calls, userID);
        workingContents.push(
          { role: "model", parts: mergeParts(modelParts) },
          { role: "user", parts: responses },
        );
        return runTurn(depth + 1);
      }

      try {
        await runTurn(0);
        controller.close();
      } catch (e: any) {
        console.error(e);
        sendToFrontend([{ error: e.message }]);
        controller.close();
      }
    },
  });
  return stream;
}
