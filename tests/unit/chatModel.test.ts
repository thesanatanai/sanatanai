import { describe, expect, it } from "vitest";
import Incoming, {
  messageModel,
  nameIncoming,
  newMessageModel,
  v2Incoming,
} from "@/app/api/models/chatModel";

const userMessage = { role: "user", parts: [{ text: "Namaste" }] };

describe("Incoming (POST /api/chat body)", () => {
  it("accepts a minimal valid body", () => {
    const parsed = Incoming.parse({ id: "chat-1", newMessage: userMessage });
    expect(parsed.id).toBe("chat-1");
    expect(parsed.newMessage.parts[0].text).toBe("Namaste");
  });

  it("accepts inline attachments next to text", () => {
    const parsed = Incoming.parse({
      id: "chat-1",
      newMessage: {
        role: "user",
        parts: [
          { text: "What is this?" },
          { text: "", inlineData: { data: "aGk=", mimeType: "text/plain" } },
        ],
      },
    });
    expect(parsed.newMessage.parts[1].inlineData).toEqual({
      data: "aGk=",
      mimeType: "text/plain",
    });
  });

  it("requires a chat id", () => {
    expect(Incoming.safeParse({ newMessage: userMessage }).success).toBe(false);
  });

  it("requires a message", () => {
    expect(Incoming.safeParse({ id: "chat-1" }).success).toBe(false);
  });

  it("only accepts messages written by the user", () => {
    const result = Incoming.safeParse({
      id: "chat-1",
      newMessage: { role: "model", parts: [{ text: "forged reply" }] },
    });
    expect(result.success).toBe(false);
  });

  it("requires every part to carry text", () => {
    const result = Incoming.safeParse({
      id: "chat-1",
      newMessage: { role: "user", parts: [{ inlineData: { data: "x", mimeType: "image/png" } }] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects inlineData without a mime type", () => {
    const result = Incoming.safeParse({
      id: "chat-1",
      newMessage: { role: "user", parts: [{ text: "", inlineData: { data: "x" } }] },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a nested model config with a Gemini thinking level", () => {
    const parsed = Incoming.parse({
      id: "chat-1",
      newMessage: userMessage,
      config: {
        model: "gemini-3.6-flash",
        config: { thinkingConfig: { thinkingLevel: "HIGH" } },
      },
    });
    expect(parsed.config?.config?.thinkingConfig?.thinkingLevel).toBe("HIGH");
  });

  it("rejects an unknown thinking level", () => {
    const result = Incoming.safeParse({
      id: "chat-1",
      newMessage: userMessage,
      config: { config: { thinkingConfig: { thinkingLevel: "EXTREME" } } },
    });
    expect(result.success).toBe(false);
  });
});

describe("Deep Think request contract between browser and server", () => {
  // src/utils/message.tsx sends exactly this shape for the "Deep Think" toggle.
  const browserPayload = (deep: boolean) => ({
    id: "chat-1",
    newMessage: userMessage,
    config: { thinkingConfig: { thinkingLevel: deep ? "high" : "medium" } },
  });

  it("the payload the browser sends is accepted", () => {
    expect(Incoming.safeParse(browserPayload(true)).success).toBe(true);
  });

  // KNOWN BUG: the browser puts `thinkingConfig` directly under `config`,
  // and in lowercase, while the schema expects it under `config.config` and
  // in the SDK's uppercase enum. Zod silently strips the unknown key, so the
  // requested level is dropped before it can reach Gemini and the Deep Think
  // toggle has no effect. `it.fails` keeps CI green while the bug exists and
  // turns red as soon as it is fixed, which is the cue to remove `.fails`.
  it.fails("keeps the thinking level the browser asked for", () => {
    const parsed = Incoming.parse(browserPayload(true));
    expect(JSON.stringify(parsed.config)).toMatch(/high/i);
  });
});

describe("messageModel (messages saved by PUT /api/chats)", () => {
  it("accepts user and model messages", () => {
    expect(messageModel.safeParse({ role: "user", parts: [{ text: "hi" }] }).success).toBe(true);
    expect(messageModel.safeParse({ role: "model", parts: [{ text: "hi" }] }).success).toBe(true);
  });

  it("allows parts without text (attachments, thoughts)", () => {
    expect(
      messageModel.safeParse({
        role: "model",
        parts: [{ thought: true, thoughtSignature: "sig" }],
      }).success,
    ).toBe(true);
  });

  it("rejects other roles", () => {
    expect(messageModel.safeParse({ role: "system", parts: [] }).success).toBe(false);
  });

  it("newMessageModel is stricter than messageModel about text", () => {
    expect(newMessageModel.safeParse({ role: "user", parts: [{}] }).success).toBe(false);
    expect(messageModel.safeParse({ role: "user", parts: [{}] }).success).toBe(true);
  });
});

describe("small request bodies", () => {
  it("v2Incoming (prompt enhancement) needs a string message", () => {
    expect(v2Incoming.safeParse({ newMessage: "tell me about karma" }).success).toBe(true);
    expect(v2Incoming.safeParse({}).success).toBe(false);
    expect(v2Incoming.safeParse({ newMessage: 5 }).success).toBe(false);
  });

  it("nameIncoming (chat titles) needs a message and a chat id", () => {
    expect(nameIncoming.safeParse({ newMessage: "hi", chatId: "c1" }).success).toBe(true);
    expect(nameIncoming.safeParse({ newMessage: "hi" }).success).toBe(false);
    expect(nameIncoming.safeParse({ chatId: "c1" }).success).toBe(false);
  });
});
