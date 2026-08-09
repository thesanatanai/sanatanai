/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Candidate, GoogleGenAI, Part } from "@google/genai";
import {
  getNewMessage,
  getSender,
  requestOptions,
  serverCallMap,
} from "./search";
import { setMessages } from "@/actions/chatActions";

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
      try {
        const result = await ai.models.generateContentStream(requestOptions);
        const contents = structuredClone(requestOptions.contents);
        const serverFunctions = Object.keys(serverCallMap);

        const modelParts: Part[] = [];
        for await (const chunk of result) {
          const parts = chunk.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.text) modelParts.push({ text: part.text });
            if (part.functionCall) {
              const name = part.functionCall.name as string;
              const args = part.functionCall.args as Record<string, string>;

              if (serverFunctions.includes(name)) {
                const functionResult = await serverCallMap[
                  name as keyof typeof serverCallMap
                ](args.query);
                const restart = this.start?.bind(this) as (
                  controller: unknown,
                ) => void;

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
                // Restart the Controller
                restart(controller);
                return;
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
