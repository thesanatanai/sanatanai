import {
  Content,
  FunctionCall,
  FunctionDeclaration,
  GenerateContentConfig,
  Part,
  Tool,
  Type,
} from "@google/genai";
import { tavily } from "@tavily/core";
import z from "zod";
import { chatJSON } from "@/actions/chatActions";
import userModel from "../models/user";

const client = tavily({ apiKey: process.env.TAVILY_API as string });

const tavilyConfig = {
  depth: "basic",
  max: 10,
  maxChars: 20_000,
} as const;
const memoryConfig = {
  max: 50,
  maxChars: 300
} as const;

// ---------------------------------------------------------------------------
// Tool implementations
// Every tool returns a plain object (Gemini needs an object as the response)
// and never throws: failures come back as { error } so the model can recover.
// ---------------------------------------------------------------------------
async function search(query: string) {
  try {
    const res = await client.search(query, {
      includeAnswer: "basic",
      searchDepth: tavilyConfig.depth,
      maxResults: tavilyConfig.max,
    });
    // Only what the model needs: no images, request ids, timings, scores...
    return {
      answer: res.answer,
      results: res.results.map(({ title, url, content, publishedDate }) => ({
        title,
        url,
        content,
        publishedDate,
      })),
    };
  } catch (e) {
    console.error(e);
    return {
      error:
        "Unable to search right now. Answer from your own knowledge and say that you could not search.",
    };
  }
}

async function visitUrl(url: string) {
  try {
    const res = await client.extract([url]);
    return {
      results: res.results.map(({ url, title, rawContent }) => {
        const text = rawContent ?? "";
        return {
          url,
          title,
          content: text.slice(0, tavilyConfig.maxChars),
          truncated: text.length > tavilyConfig.maxChars,
        };
      }),
      failed: res.failedResults,
    };
  } catch (e) {
    console.error(e);
    return {
      error:
        "Unable to open that page right now. Answer from your own knowledge.",
    };
  }
}

async function setMemory(memory: string, id: string) {
  // One atomic update: it only matches while the user still has room, and
  // $addToSet never stores the same memory twice. (It is also awaited now -
  // before, the write was fire-and-forget and the tool reported success early.)
  const res = await userModel.updateOne(
    { id, [`memories.${memoryConfig.max - 1}`]: { $exists: false } },
    { $addToSet: { memories: memory } },
  );
  if (res.matchedCount === 0) {
    return {
      error: `Memory is full (limit ${memoryConfig.max}) or the user was not found. Delete a less useful memory first with delete_memory.`,
    };
  }
  return { success: true, alreadyKnown: res.modifiedCount === 0 };
}

async function deleteMemory(index: number, id: string) {
  const user = await userModel.findOne({ id }).select("memories");
  if (!user) return { error: "User not found" };

  const memories = user.memories;
  if(!memories) return;
  if (index >= memories.length) {
    return {
      error: `No memory at index ${index}. There are ${memories.length} memories (indexes start at 0).`,
    };
  }
  const [deleted] = memories.splice(index, 1);
  await userModel.updateOne({ id }, { memories });
  return { success: true, deleted };
}

// ---------------------------------------------------------------------------
// Tool registry: arguments are validated with Zod before anything runs
// ---------------------------------------------------------------------------
const defineTool =
  <S extends z.ZodType>(
    schema: S,
    run: (args: z.infer<S>, userId: string) => Promise<unknown>,
  ) =>
  async (rawArgs: unknown, userId: string): Promise<unknown> => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      return { error: `Invalid arguments. ${z.prettifyError(parsed.error)}` };
    }
    return run(parsed.data, userId);
  };

const serverTools = {
  web_search: defineTool(
    z.object({ query: z.string().trim().min(1).max(400) }),
    ({ query }) => search(query),
  ),
  web_fetch: defineTool(
    z.object({ url: z.url({ protocol: /^https?$/ }) }),
    ({ url }) => visitUrl(url),
  ),
  set_memory: defineTool(
    z.object({ memory: z.string().trim().min(1).max(memoryConfig.maxChars) }),
    ({ memory }, id) => setMemory(memory, id),
  ),
  delete_memory: defineTool(
    z.object({ index: z.number().int().min(0) }),
    ({ index }, id) => deleteMemory(index, id),
  ),
};

export const isServerTool = (name?: string): name is keyof typeof serverTools =>
  !!name && Object.hasOwn(serverTools, name);


const serverToolDeclarations: FunctionDeclaration[] = [
  {
    name: "web_search",
    description: "Search the web (via Tavily) and get a summary plus sources.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The term or question to search for on the web.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description: "Fetch the readable contents of one specific http(s) URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The full URL to open." },
      },
      required: ["url"],
    },
  },
  {
    name: "set_memory",
    description:
      "Save one short fact about the user that will be useful in future chats.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        memory: {
          type: Type.STRING,
          description: `The fact to remember (max ${memoryConfig.maxChars} characters).`,
        },
      },
      required: ["memory"],
    },
  },
  {
    name: "delete_memory",
    description: "Delete a memory that is wrong, outdated or not useful.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        index: {
          type: Type.INTEGER,
          description: "Index of the memory to delete (starts from 0).",
        },
      },
      required: ["index"],
    },
  },
];

const toResponse = (result: unknown): Record<string, unknown> =>
  result && typeof result === "object" && !Array.isArray(result) && "error" in result
    ? (result as Record<string, unknown>)
    : { output: result ?? null };

/**
 * Runs every function call the model made in ONE step and returns the matching
 * `functionResponse` parts, in the same order as the calls.
 * - Unknown tools and bad arguments come back as { error } instead of crashing.
 * - Web tools run in parallel.
 * - Memory tools touch the same document, so they run one by one: deletes
 *   first, highest index first, so an earlier delete never shifts the index of
 *   a later one.
 */
export async function runServerTools(
  calls: FunctionCall[],
  userId: string,
): Promise<Part[]> {
  const results: unknown[] = new Array(calls.length);

  const exec = async (i: number) => {
    const { name, args } = calls[i];
    try {
      results[i] = isServerTool(name)
        ? await serverTools[name](args, userId)
        : {
            error: `Unknown tool "${name}". Available tools: ${Object.keys(serverTools).join(", ")}.`,
          };
    } catch (e) {
      console.error(`Tool ${name} failed:`, e);
      results[i] = { error: "The tool failed. Continue without it." };
    }
  };

  const all = calls.map((_, i) => i);
  const isDelete = (i: number) => calls[i].name === "delete_memory";
  const isMemory = (i: number) => isDelete(i) || calls[i].name === "set_memory";
  const deleteIndex = (i: number) => Number(calls[i].args?.index) || 0;

  const web = all.filter((i) => !isMemory(i));
  const memory = all.filter(isMemory).sort((a, b) => {
    if (isDelete(a) !== isDelete(b)) return isDelete(a) ? -1 : 1;
    return isDelete(a) ? deleteIndex(b) - deleteIndex(a) : a - b;
  });

  await Promise.all([
    Promise.all(web.map(exec)),
    (async () => {
      for (const i of memory) await exec(i);
    })(),
  ]);

  return calls.map((call, i) => ({
    functionResponse: {
      id: call.id,
      name: call.name,
      response: toResponse(results[i]),
    },
  }));
}

export type reqConfig = {
  config?: GenerateContentConfig;
  model?: string;
};

export type requestOptions = {
  model: string;
  contents: Content[];
  config: GenerateContentConfig;
};

export const getRequestParams = (
  chat: chatJSON,
  newMessage: Content,
  config?: reqConfig,
  systemPrompt?: string,
) => {
  let functionCalls: FunctionDeclaration[] = [];
  const prevMessages = cleanHistory(getMainChat(chat));
  const contents = [...prevMessages, newMessage] as Content[];
  if (
    config?.config?.tools &&
    (config.config.tools[0] as Tool)?.functionDeclarations
  ) {
    functionCalls = (config.config.tools[0] as Tool).functionDeclarations || [];
  }
  const requestOptions: requestOptions = {
    model: config?.model || "gemini-3.6-flash",
    contents,
    config: {
      ...config?.config,
      systemInstruction: systemPrompt,
      tools: [
        {
          functionDeclarations: [...functionCalls, ...serverToolDeclarations],
        },
      ],
    },
  };
  return requestOptions;
};

export const getSender = <K>(
  controller: ReadableStreamDefaultController<Uint8Array<ArrayBuffer>>,
) => {
  const encoder = new TextEncoder();
  const encode = (json: K) => encoder.encode(JSON.stringify(json));
  return function sendChunk(json: Array<K> | undefined) {
    const data = json as NonNullable<typeof json>;
    const encoded = encode(data[0]);
    controller.enqueue(encoded);
  };
};

/**
 * Builds what is saved to the database: the history plus ONE model message
 * that holds only the text the user actually saw. Function calls, function
 * responses, thoughts and signatures are never saved.
 * @param prev History to save, including the new user message
 * @param now The parts of the answer; only their text is kept
 */
export function getNewMessage(prev: Content[], now: Part[]) {
  const next = structuredClone(prev);
  const text = now.map((part) => part.text ?? "").join("");
  if (text) {
    next.push({ role: "model", parts: [{ text }] });
  }
  return next;
}

/**
 * Joins what the model returned in one step into the parts to replay to
 * Gemini. Function calls, thoughts and anything carrying a thoughtSignature
 * are kept exactly as received (Gemini 3 requires that); only neighbouring
 * plain-text parts are joined and empty ones dropped.
 */
export function mergeParts(parts: Part[]): Part[] {
  const isPlain = (p?: Part) =>
    !!p &&
    typeof p.text === "string" &&
    !p.thought &&
    !p.thoughtSignature &&
    !p.functionCall &&
    !p.inlineData;

  const out: Part[] = [];
  for (const part of parts) {
    if (isPlain(part)) {
      if (!part.text) continue;
      const prev = out.at(-1);
      if (prev && isPlain(prev)) {
        prev.text += part.text;
        continue;
      }
    }
    out.push({ ...part });
  }
  return out;
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

/**
 * Prepares saved messages for Gemini. Chats saved before this fix can hold
 * empty parts and empty messages left over from tool calls, which Gemini
 * rejects, and stray function calls with no response. Keep only text and
 * attachments, drop empty messages and join neighbours with the same role.
 */
function cleanHistory(messages: ReturnType<typeof getMainChat>): Content[] {
  const out: Content[] = [];
  for (const message of messages ?? []) {
    const parts: Part[] = [];
    for (const p of message.parts ?? []) {
      if (p.text) parts.push({ text: p.text });
      if (p.inlineData) parts.push({ inlineData: p.inlineData });
    }
    if (!parts.length) continue;
    const prev = out.at(-1);
    if (prev?.role === message.role) prev.parts?.push(...parts);
    else out.push({ role: message.role, parts });
  }
  return out;
}
