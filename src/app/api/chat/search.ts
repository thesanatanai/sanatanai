import {
  Content,
  FunctionDeclaration,
  GenerateContentConfig,
  Part,
  Tool,
  Type,
} from "@google/genai";
import { tavily } from "@tavily/core";
import { chatJSON, updateChat } from "@/actions/chatActions";
import userModel from "../models/user";

const client = tavily({ apiKey: process.env.TAVILY_API as string });

async function search(query: string) {
  try {
  return await client.search(query, {
    includeAnswer: "basic",
    searchDepth: "advanced",
    maxResults: 10,
  });
} catch (e) {
  console.error(e);
  return {error: "Internal Server Error found and unable to search for query, answer with your latest knowledge"}
}
}

const visitUrl = async (url: string) => {
  try {
 return await client.extract([url]);
  }
  catch (e) {
    console.error(e);
    return {
      error: "Sorry! an Internal server error was caused, try to answer within your knowledge.."
    }
  }
}

async function deleteMemory(idx: number, id: string) {
  const user = await userModel.findOne({ id });
  if(!user) return {error: "User not found"}

  const memories = user.memories;
  memories.splice(idx, 1);
  userModel.updateOne({
    id
  }, { memories });
}
async function setMemory(memory: string, id: string) {
  const user = await userModel.findOne({ id });
  if(!user) return {error: "User not found"}

  const memories = user.memories;
  memories.push(memory);
  userModel.updateOne({
    id
  }, { memories });
}

async function name(title: string, id: string, chatId: string) {
  const error = await updateChat(id, chatId, { title });
  if(error) return await error().json();

  return { success: "true" }
}

export type reqConfig = {
  config?: GenerateContentConfig;
  model?: string;
};

export type requestOptions = {
  model: string,
  contents: Content[],
  config: GenerateContentConfig
}

export const getRequestParams = (
  chat: chatJSON,
  newMessage: Content,
  config?: reqConfig,
  systemPrompt?: string
) => {
  let functionCalls: FunctionDeclaration[] = [];
  const prevMessages = getMainChat(chat);
  const contents = [...prevMessages, newMessage] as Content[];
  if (
    config?.config?.tools &&
    (config.config.tools[0] as Tool)?.functionDeclarations
  ) {
    functionCalls = (config.config.tools[0] as Tool).functionDeclarations || [];
  }
  const requestOptions: requestOptions = {
    model: config?.model || "gemini-3-flash-preview",
    contents,
    config: {
      ...config?.config,
      systemInstruction: systemPrompt,
      tools: [
        {
          functionDeclarations: [
            ...functionCalls,
            {
              name: "web_search",
              description:
                "Search for a specific term or phrase on the web using tavily.",
              parameters: {
                type: Type.STRING,
                description: "The Term to search on the web and get results.",
                title: "query",
              },
            },
            {
              name: "web_fetch",
              description:
                "Fetch the contents of a specific url on the web using tavily.",
              parameters: {
                type: Type.STRING,
                description: "The url to search on the web and get results.",
                title: "query",
              },
            },
            {
              name: "set_memory",
              description:
                "Set a specific information which might be useful for future chats.",
              parameters: {
                type: Type.STRING,
                description: "The memory to set.",
                title: "query",
              },
            },
            {
              name: "delete_memory",
              description: "Delete any irrevelant, wrong or non-useful memory",
              parameters: {
                type: Type.NUMBER,
                description: "The index of memory (starts from 0)",
                title: "query"
              }
            },
            {
              name: "name",
              description: "Give a name to a chat, (only in first message)",
              parameters: {
                type: Type.STRING,
                description: "The name to be given to chat",
                title: "query"
              }
            }
          ],
        },
      ],
    },
  };
  return requestOptions;
};

export const serverCallMap = {
  web_search: search,
  web_fetch: visitUrl,
  set_memory: setMemory,
  delete_memory: deleteMemory,
  name: name,
};

export const getSender = <K>(controller: ReadableStreamDefaultController<Uint8Array<ArrayBuffer>>) => {
  const encoder = new TextEncoder();
  const encode = (json: (K)) => encoder.encode(JSON.stringify(json));
  return function sendChunk(json: Array<K> | undefined) {
    const data = json as NonNullable<typeof json>;
    const encoded = encode(data[0]);
    controller.enqueue(encoded);
  }
}

/**
 * Optimizer function — combines multiple `parts` to a single bot response with single part.
 * @param prev Previous chat history to combine with
 * @param now New parts array to combine
 * @returns The new chat history — fully optimized
 */
export function getNewMessage(prev: Content[], now: Part[]) {
  const next = structuredClone(prev);
  const text = now.map(part => part.text).join("");
  if(now.length) {
    next.push({
      role: "model",
      parts: [{
        text // Only text as all other fields — functionCall, functionResponse, etc. were already removed in main loop
      }]
    });
  }
  return next;
}

export function getMainChat(chat: chatJSON, withIdx = false) {
  return chat.messages?.map((message, i) => ({
    role: message.role,
    index: withIdx ? i + 1 : undefined,
    parts: message.parts?.map((part) => ({
      text: part.text,
      inlineData: part.inlineData?.data &&
        part.inlineData.mimeType && {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        },
      functionCall: part.functionCall?.name && {
          id: part.functionCall.id,
          name: part.functionCall.name,
          args: part.functionCall.args,
        },
    })),
  }));
}