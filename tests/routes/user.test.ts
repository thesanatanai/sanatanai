import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCookieStore, jsonRequest, unauthorized } from "../helpers/request";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  verifyIdToken: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn(),
  cookies: undefined as ReturnType<typeof import("../helpers/request").fakeCookieStore> | undefined,
}));

vi.mock("@/app/api/utils/verify", () => ({ default: mocks.verifyUser }));
vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/models/chat", () => ({ default: {} }));
vi.mock("@/app/api/models/user", () => ({
  default: { findOne: mocks.findOne, create: mocks.create, updateOne: mocks.updateOne },
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookies }));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = mocks.verifyIdToken;
  },
}));

import { GET, POST, PUT } from "@/app/api/user/route";

const secret = process.env.JWT_SECRET!;
const googleProfile = (overrides = {}) => ({
  getPayload: () => ({
    email: "user@example.com",
    name: "Shivam",
    picture: "https://example.com/me.png",
    email_verified: true,
    ...overrides,
  }),
});
const storedUser = (overrides = {}) => ({
  id: "user-1",
  email: "user@example.com",
  name: "Shivam",
  toJSON() {
    return { id: this.id, email: this.email, name: this.name };
  },
  ...overrides,
});

beforeEach(() => {
  mocks.cookies = fakeCookieStore();
  mocks.findOne.mockResolvedValue(null);
  mocks.updateOne.mockResolvedValue({});
  mocks.create.mockImplementation(async (doc) => storedUser(doc));
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("GET /api/user", () => {
  it("returns the signed-in user's profile", async () => {
    mocks.verifyUser.mockResolvedValue(storedUser());
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "User found",
      userData: { id: "user-1", email: "user@example.com", name: "Shivam" },
    });
  });

  it("answers 401 without a valid session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized("Invalid token"));
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid token" });
  });
});

describe("PUT /api/user", () => {
  beforeEach(() => {
    mocks.verifyUser.mockResolvedValue(storedUser());
  });

  it("updates the profile of the signed-in user", async () => {
    const res = await PUT(jsonRequest("/api/user", "PUT", { name: "Ram", preferredLocale: "hi" }));
    expect(res.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { id: "user-1" },
      { $set: { name: "Ram", preferredLocale: "hi" } },
    );
  });

  it("can replace the saved memories", async () => {
    await PUT(jsonRequest("/api/user", "PUT", { memories: ["a", "b"] }));
    expect(mocks.updateOne).toHaveBeenCalledWith({ id: "user-1" }, { $set: { memories: ["a", "b"] } });
  });

  it("silently drops fields a user must never change themselves", async () => {
    await PUT(
      jsonRequest("/api/user", "PUT", {
        name: "Ram",
        id: "someone-else",
        email: "attacker@example.com",
        picture: "https://evil.example/x.png",
        isAdmin: true,
      }),
    );
    expect(mocks.updateOne).toHaveBeenCalledWith({ id: "user-1" }, { $set: { name: "Ram" } });
  });

  it("only ever updates the session's own user", async () => {
    await PUT(jsonRequest("/api/user", "PUT", { name: "Ram" }));
    expect(mocks.updateOne.mock.calls[0][0]).toEqual({ id: "user-1" });
  });

  it.each([
    ["a name longer than 25 characters", { name: "x".repeat(26) }],
    ["an unsupported language", { preferredLocale: "fr" }],
    ["memories that are not strings", { memories: [1, 2] }],
  ])("rejects %s", async (_label, body) => {
    const res = await PUT(jsonRequest("/api/user", "PUT", body));
    expect(res.status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("accepts a name of exactly 25 characters", async () => {
    const res = await PUT(jsonRequest("/api/user", "PUT", { name: "x".repeat(25) }));
    expect(res.status).toBe(200);
  });

  it("rejects a request with nothing to change", async () => {
    const res = await PUT(jsonRequest("/api/user", "PUT", { unknown: 1 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No valid changes" });
  });

  it("answers 401 without a valid session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    const res = await PUT(jsonRequest("/api/user", "PUT", { name: "Ram" }));
    expect(res.status).toBe(401);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not JSON", async () => {
    const res = await PUT(jsonRequest("/api/user", "PUT", "{not json"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/user (Google sign-in)", () => {
  beforeEach(() => {
    mocks.verifyIdToken.mockResolvedValue(googleProfile());
  });
  const signIn = (body: unknown = { credential: "google-id-token" }) =>
    POST(jsonRequest("/api/user", "POST", body));

  it("verifies the ID token against this app's Google client", async () => {
    await signIn();
    expect(mocks.verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: "test-google-client-id",
    });
  });

  it("registers a new user from the Google profile", async () => {
    const res = await signIn({ credential: "t", locale: "en" });

    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe("User registered");
    expect(mocks.create).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f]{64}$/),
      name: "Shivam",
      email: "user@example.com",
      picture: "https://example.com/me.png",
      preferredLocale: "en",
    });
  });

  it("defaults new users to Hindi when no language was chosen", async () => {
    await signIn();
    expect(mocks.create.mock.calls[0][0].preferredLocale).toBe("hi");
  });

  it("copes with a Google profile that has no name or picture", async () => {
    mocks.verifyIdToken.mockResolvedValue(googleProfile({ name: undefined, picture: undefined }));
    await signIn();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: "", picture: "" });
  });

  it("logs an existing user in without creating a duplicate", async () => {
    mocks.findOne.mockResolvedValue(storedUser());
    const res = await signIn();
    expect((await res.json()).message).toBe("User logged in");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.findOne).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("issues a one-year session cookie that cannot be read by scripts", async () => {
    mocks.findOne.mockResolvedValue(storedUser());
    await signIn();

    const cookie = mocks.cookies!.jar.get("token")!;
    expect(cookie).toMatchObject({
      name: "token",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 3600,
    });
    const payload = jwt.verify(cookie.value as string, secret) as jwt.JwtPayload;
    expect(payload.id).toBe("user-1");
    expect(payload.exp! - payload.iat!).toBeGreaterThanOrEqual(365 * 24 * 3600 - 1);
  });

  it("marks the cookie secure only in production (so local http still works)", async () => {
    mocks.findOne.mockResolvedValue(storedUser());
    await signIn();
    expect(mocks.cookies!.jar.get("token")!.secure).toBe(false);

    mocks.cookies = fakeCookieStore();
    vi.stubEnv("NODE_ENV", "production");
    await signIn();
    expect(mocks.cookies.jar.get("token")!.secure).toBe(true);
  });

  it("rejects a body without a credential", async () => {
    const res = await signIn({});
    expect(res.status).toBe(400);
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });

  it("rejects an unsupported language", async () => {
    expect((await signIn({ credential: "t", locale: "de" })).status).toBe(400);
  });

  it("answers 401 for a token Google does not accept", async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error("Wrong recipient"));
    const res = await signIn();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid Google Token" });
    expect(mocks.cookies!.jar.has("token")).toBe(false);
  });

  it("rejects a token without an email", async () => {
    mocks.verifyIdToken.mockResolvedValue(googleProfile({ email: undefined }));
    const res = await signIn();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid token payload" });
  });

  it("rejects an email Google has not verified", async () => {
    mocks.verifyIdToken.mockResolvedValue(googleProfile({ email_verified: false }));
    const res = await signIn();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Email not Verified to Google" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.cookies!.jar.has("token")).toBe(false);
  });
});
