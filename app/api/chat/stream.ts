/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Candidate, GoogleGenAI, Part } from "@google/genai";
import {
  getNewMessage,
  getSender,
  requestOptions,
  serverCallMap,
} from "./search";
import { setMessages } from "@/actions/chatActions";


// Hard cap on chained server-side tool calls (web_search / web_fetch) per
// user turn. Without this, a model that keeps requesting tool calls back
// to back would recurse forever - holding the connection open indefinitely
// and burning unbounded Gemini/Tavily quota on a single user message.
const MAX_TOOL_CALL_STEPS = 8;

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
      const serverFunctions = Object.keys(serverCallMap);

      async function runTurn(depth: number): Promise<void> {
        // Snapshot *at the start of this turn* - requestOptions.contents
        // has already been extended with the previous turn's function
        // call/response by the time we recurse, and that history needs to
        // make it into what gets persisted.
        const contents = structuredClone(requestOptions.contents);
        const result = await ai.models.generateContentStream(requestOptions);
        const modelParts: Part[] = [];

        for await (const chunk of result) {
          const parts = chunk.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.text) modelParts.push({ text: part.text });
            if (part.functionCall) {
              const name = part.functionCall.name as string;
              const args = part.functionCall.args as Record<string, string>;

              if (serverFunctions.includes(name)) {
                if (depth >= MAX_TOOL_CALL_STEPS) {
                  // Stop chaining tool calls and let the frontend know why,
                  // instead of looping (potentially) forever. Persist
                  // whatever text was generated so far rather than
                  // silently dropping it.
                  sendToFrontend([
                    { error: "Tool call limit reached, please try rephrasing your request." },
                  ]);
                  await setMessages(
                    userID,
                    chatID,
                    getNewMessage(contents, modelParts),
                  );
                  return;
                }
                const functionResult = await serverCallMap[
                  name as keyof typeof serverCallMap
                ](args.query);
                

                requestOptions.contents.push(
                  { role: "model", parts: structuredClone(modelParts) },
                  {
                    role: "user",
                    parts: [
                      {
                        functionResponse: { name, response: functionResult },
                      },
                    ],
                  },
                );

                modelParts.length = 0; // Clear modelParts
                return runTurn(depth + 1)
              }
              else {
                modelParts.push({
                functionCall: part.functionCall,
                thoughtSignature: part.thoughtSignature,
              });
              }
            }
          }
          sendToFrontend(chunk.candidates);
        }

        await setMessages(
          userID,
          chatID,
          getNewMessage(contents, modelParts),
        ); // Set messages on database
      }

      try {
        await runTurn(0);
        controller.close(); // Close the controller
      } catch (e: any) {
        console.error(e);
        sendToFrontend([{ error: e.message }]);
        controller.close();
      }
    },
  });
  return stream;
}
