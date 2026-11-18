import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  cookieDelete: vi.fn(),
  io: vi.fn(),
  findOne: vi.fn(),
  sendOTP: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "token" && mocks.token ? { value: mocks.token } : undefined),
    delete: mocks.cookieDelete,
  }),
}));
vi.mock("next/cache", () => ({ io: mocks.io }));
vi.mock("@/app/api/models/user", () => ({ default: { findOne: mocks.findOne } }));
vi.mock("@/app/api/models/chat", () => ({ default: {} }));
vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/utils/sendMail", () => ({ _sendOTP: mocks.sendOTP }));

const secret = process.env.JWT_SECRET!;
const sign = (payload: object, key = secret, options: jwt.SignOptions = {}) =>
  jwt.sign(payload, key, options);

async function load() {
  vi.resetModules();
  return import("@/app/api/utils/verify");
}

/** Calls an error factory returned by verifyUser and reads its response. */
async function errorOf(result: unknown) {
  expect(typeof result).toBe("function");
  const response = (result as () => Response)();
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  mocks.token = undefined;
  mocks.cookieDelete.mockReset();
  mocks.io.mockReset();
  mocks.findOne.mockReset();
  mocks.sendOTP.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("verifyUser", () => {
  it("rejects a request without a session cookie and clears the stale cookies", async () => {
    const { default: verifyUser } = await load();
    const result = await verifyUser();
    expect(await errorOf(result)).toEqual({ status: 401, body: { error: "Token not found" } });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({ name: "token" });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({ name: "setupComplete" });
  });

  it("leaves cookies alone when asked not to delete them", async () => {
    const { default: verifyUser } = await load();
    await verifyUser(false);
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("returns the user for a valid session", async () => {
    const user = { id: "user-1", name: "Shivam" };
    mocks.findOne.mockResolvedValue(user);
    mocks.token = sign({ id: "user-1" });
    const { default: verifyUser } = await load();

    expect(await verifyUser()).toBe(user);
    expect(mocks.findOne).toHaveBeenCalledWith({ id: "user-1" });
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("opts the request into dynamic rendering", async () => {
    mocks.findOne.mockResolvedValue({ id: "user-1" });
    mocks.token = sign({ id: "user-1" });
    const { default: verifyUser } = await load();
    await verifyUser();
    expect(mocks.io).toHaveBeenCalledTimes(1);
  });

  it("rejects a token signed with another secret", async () => {
    mocks.token = sign({ id: "user-1" }, "some-other-secret");
    const { default: verifyUser } = await load();
    expect(await errorOf(await verifyUser())).toEqual({ status: 401, body: { error: "Invalid token" } });
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).toHaveBeenCalledWith({ name: "token" });
  });

  it("rejects an expired token", async () => {
    mocks.token = sign({ id: "user-1" }, secret, { expiresIn: -10 });
    const { default: verifyUser } = await load();
    expect((await errorOf(await verifyUser())).body).toEqual({ error: "Invalid token" });
  });

  it("rejects a malformed token", async () => {
    mocks.token = "not.a.jwt";
    const { default: verifyUser } = await load();
    expect((await errorOf(await verifyUser())).body).toEqual({ error: "Invalid token" });
  });

  it("rejects an unsigned token (alg: none)", async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    mocks.token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ id: "user-1" })}.`;
    const { default: verifyUser } = await load();
    expect((await errorOf(await verifyUser())).body).toEqual({ error: "Invalid token" });
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("rejects a valid token whose user no longer exists", async () => {
    mocks.findOne.mockResolvedValue(null);
    mocks.token = sign({ id: "deleted-user" });
    const { default: verifyUser } = await load();
    expect(await errorOf(await verifyUser())).toEqual({ status: 401, body: { error: "User not found" } });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({ name: "token" });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({ name: "setupComplete" });
  });

  it("treats a database failure as 'user not found' instead of crashing", async () => {
    mocks.findOne.mockRejectedValue(new Error("mongo down"));
    mocks.token = sign({ id: "user-1" });
    const { default: verifyUser } = await load();
    expect((await errorOf(await verifyUser())).body).toEqual({ error: "User not found" });
  });
});

describe("sendOtp", () => {
  it("rejects an invalid email without sending anything", async () => {
    const { sendOtp } = await load();
    expect(await errorOf(await sendOtp("not-an-email"))).toEqual({
      status: 400,
      body: { error: "Email is invalid" },
    });
    expect(mocks.sendOTP).not.toHaveBeenCalled();
  });

  it("emails a six digit code and returns it", async () => {
    mocks.sendOTP.mockResolvedValue(true);
    const { sendOtp } = await load();

    const otp = await sendOtp("user@example.com");

    expect(typeof otp).toBe("number");
    expect(String(otp)).toMatch(/^\d{6}$/);
    expect(mocks.sendOTP).toHaveBeenCalledWith(otp, "user@example.com");
  });

  it("does not always generate the same code", async () => {
    mocks.sendOTP.mockResolvedValue(true);
    const { sendOtp } = await load();
    const codes = new Set<unknown>();
    for (let i = 0; i < 20; i++) codes.add(await sendOtp("user@example.com"));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("lets a mail delivery failure propagate to the caller", async () => {
    mocks.sendOTP.mockRejectedValue(new Error("resend down"));
    const { sendOtp } = await load();
    await expect(sendOtp("user@example.com")).rejects.toThrow("resend down");
  });
});

describe("environment validation", () => {
  it.each(["NEXT_PUBLIC_OAUTH_CLIENT_ID", "MONGO_URI", "JWT_SECRET", "GENAI", "TAVILY_API", "RESEND_API"])(
    "fails fast when %s is missing",
    async (name) => {
      vi.stubEnv(name, undefined);
      await expect(load()).rejects.toThrow();
    },
  );

  it("does not require the optional variables", async () => {
    vi.stubEnv("GA_ID", undefined);
    vi.stubEnv("MONGO_DEV", undefined);
    await expect(load()).resolves.toBeDefined();
  });
});
