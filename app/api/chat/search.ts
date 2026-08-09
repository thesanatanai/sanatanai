import {
  Content,
  FunctionDeclaration,
  GenerateContentConfig,
  Part,
  Tool,
  Type,
} from "@google/genai";
import { tavily } from "@tavily/core";
import { chatJSON } from "@/actions/chatActions";

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

export function getNewMessage(prev: Content[], now: Part[]) {
  const next = structuredClone(prev);
  if(now.length) {
    next.push({
      role: "model",
      parts: now
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