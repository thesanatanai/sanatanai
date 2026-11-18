import { describe, expect, it } from "vitest";
import chatModel from "@/app/api/models/chat";
import userModel from "@/app/api/models/user";
import otpModel, { blackListedModel } from "@/app/api/models/verify";

// Schemas are validated in memory: no database connection is needed.
const errorsOf = (model: { validate(): Promise<unknown> }) =>
  model.validate().then(
    () => [] as string[],
    (error: { errors: object }) => Object.keys(error.errors),
  );

const indexes = (model: { schema: { indexes(): [Record<string, unknown>, Record<string, unknown>][] } }) =>
  model.schema.indexes();

describe("user model", () => {
  const valid = { id: "u1", email: "user@example.com", name: "Shivam" };

  it("accepts a complete user", async () => {
    expect(await errorsOf(new userModel(valid))).toEqual([]);
  });

  it.each(["id", "email"])("requires %s", async (field) => {
    const doc = { ...valid } as Record<string, unknown>;
    delete doc[field];
    expect(await errorsOf(new userModel(doc))).toEqual([field]);
  });

  it("defaults to English and an empty picture", async () => {
    const user = new userModel(valid);
    expect(user.preferredLocale).toBe("en");
    expect(user.picture).toBe("");
  });

  it("only supports English and Hindi", async () => {
    expect(await errorsOf(new userModel({ ...valid, preferredLocale: "hi" }))).toEqual([]);
    expect(await errorsOf(new userModel({ ...valid, preferredLocale: "fr" }))).toEqual(["preferredLocale"]);
  });

  it("stores memories as a list of strings", async () => {
    const user = new userModel({ ...valid, memories: ["Likes the Gita", "Lives in Jaipur"] });
    expect(await errorsOf(user)).toEqual([]);
    expect([...user.memories!]).toEqual(["Likes the Gita", "Lives in Jaipur"]);
  });

  it("has unique indexes on id and email", async () => {
    const unique = indexes(userModel).filter(([, options]) => options.unique);
    const fields = unique.flatMap(([keys]) => Object.keys(keys));
    expect(fields).toEqual(expect.arrayContaining(["id", "email"]));
  });
});

describe("chat model", () => {
  const valid = { id: "u1", chatId: "c1" };

  it("accepts a new empty chat and fills in the defaults", async () => {
    const chat = new chatModel(valid);
    expect(await errorsOf(chat)).toEqual([]);
    expect(chat.title).toBe("New Chat");
    expect(chat.timestamp).toBeGreaterThan(Date.now() - 5000);
    expect(chat.messages).toHaveLength(0);
  });

  it.each(["id", "chatId"])("requires %s", async (field) => {
    const doc = { ...valid } as Record<string, unknown>;
    delete doc[field];
    expect(await errorsOf(new chatModel(doc))).toEqual([field]);
  });

  it("stores text, attachments and function calls in message parts", async () => {
    const chat = new chatModel({
      ...valid,
      messages: [
        { role: "user", parts: [{ text: "hi" }, { inlineData: { data: "aGk=", mimeType: "text/plain" } }] },
        { role: "model", parts: [{ functionCall: { id: "1", name: "web_search", args: { query: "q" } } }] },
      ],
    });
    expect(await errorsOf(chat)).toEqual([]);
    expect(chat.messages).toHaveLength(2);
  });

  it("only allows the roles 'user' and 'model'", async () => {
    const chat = new chatModel({ ...valid, messages: [{ role: "system", parts: [{ text: "x" }] }] });
    expect(await errorsOf(chat)).toEqual(["messages.0.role"]);
  });

  it("indexes chats by owner+chat id and by chat id, both unique", async () => {
    const unique = indexes(chatModel).filter(([, options]) => options.unique).map(([keys]) => keys);
    expect(unique).toContainEqual({ id: 1, chatId: 1 });
    expect(unique).toContainEqual({ chatId: 1 });
  });
});

describe("OTP verification model", () => {
  it("requires an email and a hashed code", async () => {
    expect(await errorsOf(new otpModel({}))).toEqual(expect.arrayContaining(["email", "otpHash"]));
    expect(await errorsOf(new otpModel({ email: "a@b.co", otpHash: "abc" }))).toEqual([]);
  });

  it("expires codes after ten minutes", async () => {
    const ttl = indexes(otpModel).find(([keys]) => "createdAt" in keys);
    expect(ttl?.[1].expireAfterSeconds).toBe(600);
  });

  it("stamps the creation time", async () => {
    const otp = new otpModel({ email: "a@b.co", otpHash: "abc" });
    expect(Math.abs(otp.createdAt.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("has no field that could hold a plain-text code", async () => {
    expect(Object.keys(otpModel.schema.paths)).not.toContain("otp");
  });
});

describe("blacklist model", () => {
  it("requires an email", async () => {
    expect(await errorsOf(new blackListedModel({}))).toEqual(["email"]);
  });

  it("locks an email for five minutes by default", async () => {
    const entry = new blackListedModel({ email: "a@b.co" });
    const fiveMinutes = 5 * 60 * 1000;
    expect(entry.endTime).toBeGreaterThan(Date.now() + fiveMinutes - 5000);
    expect(entry.endTime).toBeLessThanOrEqual(Date.now() + fiveMinutes);
  });

  it("keeps one record per email", async () => {
    const unique = indexes(blackListedModel).filter(([, options]) => options.unique).map(([keys]) => keys);
    expect(unique).toContainEqual({ email: 1 });
  });
});
