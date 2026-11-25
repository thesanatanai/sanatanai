import { describe, expect, it } from "vitest";
import { request } from "./support";

// Each request is well-formed, so the only thing wrong with it is the missing
// session (some routes validate the body before they check the session).
const message = { role: "user", parts: [{ text: "hi" }] };
const protectedEndpoints: [method: string, path: string, body?: unknown][] = [
  ["GET", "/api/user"],
  ["GET", "/api/chats"],
  ["POST", "/api/chats"],
  ["GET", "/api/chats/chat-1"],
  ["DELETE", "/api/chats/chat-1"],
  ["PUT", "/api/chats/chat-1", { messages: [message] }],
  ["POST", "/api/chat", { id: "chat-1", newMessage: message }],
  ["POST", "/api/chat/name", { newMessage: "hi", chatId: "chat-1" }],
  ["POST", "/api/chat/v2", { newMessage: "hi" }],
  ["GET", "/api/user/memories"],
  ["DELETE", "/api/user/memories", "some memory"],
];

describe("API authentication", () => {
  it.each(protectedEndpoints)("%s %s requires a session", async (method, path, body) => {
    const res = await request(path, { method, json: body });
    console.log(res.status, path)
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: "Token not found" });
  });

  it("rejects a forged session token", async () => {
    const res = await request("/api/user", { cookie: "token=forged.token.value" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid token" });
  });

  it("clears the bad session cookie", async () => {
    const res = await request("/api/chats", { cookie: "token=forged.token.value" });
    expect(res.headers.get("set-cookie")).toMatch(/token=;/);
  });
});

describe("API validation (no database needed)", () => {
  it("OTP request rejects an invalid email", async () => {
    const res = await request("/api/user/otp", { method: "PUT", json: { email: "not-an-email" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid Email" });
  });

  it("OTP verification rejects a malformed code", async () => {
    const res = await request("/api/user/otp", { method: "POST", json: { email: "a@b.co", otp: "12" } });
    expect(res.status).toBe(400);
  });

  it("Google sign-in rejects a body without a credential", async () => {
    const res = await request("/api/user", { method: "POST", json: {} });
    expect(res.status).toBe(400);
  });

  it("profile update rejects an over-long name before touching anything", async () => {
    const res = await request("/api/user", { method: "PUT", json: { name: "x".repeat(26) } });
    expect(res.status).toBe(400);
  });
});

describe("HTTP methods", () => {
  it.each([
    ["DELETE", "/api/user"],
    ["GET", "/api/chat"],
    ["PUT", "/api/chat/name"],
    ["POST", "/api/user/memories"],
  ])("%s %s is not allowed", async (method, path) => {
    const res = await request(path, { method });
    expect(res.status).toBe(405);
  });
});
