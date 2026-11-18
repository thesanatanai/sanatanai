import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateHash } from "@/app/api/utils/respondErr";
import { fakeCookieStore, jsonRequest } from "../helpers/request";

// ---------------------------------------------------------------------------
// A tiny in-memory stand-in for the two OTP collections. It implements only
// the operations the route uses, so the attempt counting and lockout logic can
// be exercised end to end across several requests.
// ---------------------------------------------------------------------------
interface LockRecord { email: string; tries?: number; endTime: number }

const db = vi.hoisted(() => ({
  otps: new Map<string, { email: string; otpHash: string; createdAt: Date }>(),
  locks: new Map<string, { email: string; tries?: number; endTime: number }>(),
}));

const mocks = vi.hoisted(() => ({
  sendOtp: vi.fn(),
  userFindOne: vi.fn(),
  userCreate: vi.fn(),
  cookies: undefined as ReturnType<typeof import("../helpers/request").fakeCookieStore> | undefined,
}));

vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/utils/verify", () => ({ sendOtp: mocks.sendOtp }));
vi.mock("@/app/api/models/chat", () => ({ default: {} }));
vi.mock("@/app/api/models/user", () => ({
  default: { findOne: mocks.userFindOne, create: mocks.userCreate },
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookies }));
vi.mock("@/app/api/models/verify", () => ({
  default: {
    findOne: async ({ email }: { email: string }) => db.otps.get(email) ?? null,
    deleteOne: async ({ email }: { email: string }) => void db.otps.delete(email),
    create: async (doc: { email: string; otpHash: string; createdAt: number }) =>
      void db.otps.set(doc.email, { ...doc, createdAt: new Date(doc.createdAt) }),
  },
  blackListedModel: {
    findOne: async ({ email }: { email: string }) => db.locks.get(email) ?? null,
    deleteOne: async ({ email }: { email: string }) => void db.locks.delete(email),
    // Atomic increment with upsert, as MongoDB does it.
    findOneAndUpdate: async (
      { email }: { email: string },
      update: { $inc: { tries: number }; $setOnInsert: { endTime: number } },
    ) => {
      const row = db.locks.get(email) ?? { email, ...update.$setOnInsert };
      row.tries = (row.tries ?? 0) + update.$inc.tries;
      db.locks.set(email, row);
      return row;
    },
    updateOne: async ({ email }: { email: string }, update: { $set: Partial<LockRecord> }) => {
      db.locks.set(email, { email, endTime: 0, ...db.locks.get(email), ...update.$set });
    },
  },
}));

import { POST, PUT } from "@/app/api/user/otp/route";

const EMAIL = "user@example.com";
const CODE = 123456;
const secret = process.env.JWT_SECRET!;

const requestCode = (email = EMAIL) => PUT(jsonRequest("/api/user/otp", "PUT", { email }));
const verify = (otp: string, extra: object = {}) =>
  POST(jsonRequest("/api/user/otp", "POST", { email: EMAIL, otp, ...extra }));
const errorOf = async (res: Response) => (await res.json()).error as string;

/** Puts a live OTP for EMAIL straight into the fake database. */
const seedOtp = (age = 0, code = CODE) =>
  db.otps.set(EMAIL, { email: EMAIL, otpHash: generateHash(code), createdAt: new Date(Date.now() - age) });

const storedUser = { id: "user-1", toJSON: () => ({ id: "user-1", email: EMAIL }) };

beforeEach(() => {
  db.otps.clear();
  db.locks.clear();
  mocks.cookies = fakeCookieStore();
  mocks.sendOtp.mockReset().mockResolvedValue(CODE);
  mocks.userFindOne.mockReset().mockResolvedValue(null);
  mocks.userCreate.mockReset().mockImplementation(async (doc) => ({ ...doc, toJSON: () => doc }));
  // setDelTimer schedules a 10 minute cleanup: keep it from ever firing.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PUT /api/user/otp (request a code)", () => {
  it("emails a code and stores only its hash", async () => {
    const res = await requestCode();

    expect(res.status).toBe(200);
    expect(mocks.sendOtp).toHaveBeenCalledWith(EMAIL);
    const stored = db.otps.get(EMAIL)!;
    expect(stored.otpHash).toBe(generateHash(CODE));
    expect(JSON.stringify(stored)).not.toContain(String(CODE));
  });

  it("starts the new code with a fresh attempt budget", async () => {
    db.locks.set(EMAIL, { email: EMAIL, tries: 4, endTime: 0 });
    await requestCode();
    expect(db.locks.get(EMAIL)).toMatchObject({ tries: 0, endTime: 0 });
  });

  it("rejects an invalid email address", async () => {
    const res = await requestCode("not-an-email");
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe("Invalid Email");
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it("does not send a second code while the first is still valid", async () => {
    seedOtp();
    const res = await requestCode();
    expect(res.status).toBe(200);
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it("sends a new code once the old one has expired", async () => {
    seedOtp(11 * 60 * 1000);
    await requestCode();
    expect(mocks.sendOtp).toHaveBeenCalledTimes(1);
    expect(db.otps.get(EMAIL)!.otpHash).toBe(generateHash(CODE));
  });

  it("refuses to send codes to a locked-out email", async () => {
    db.locks.set(EMAIL, { email: EMAIL, tries: 6, endTime: Date.now() + 60_000 });
    const res = await requestCode();
    expect(res.status).toBe(429);
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it("sends codes again once the lock has run out", async () => {
    db.locks.set(EMAIL, { email: EMAIL, tries: 6, endTime: Date.now() - 1 });
    expect((await requestCode()).status).toBe(200);
    expect(mocks.sendOtp).toHaveBeenCalledTimes(1);
  });

  it("passes on the error when the email cannot be sent", async () => {
    const failure = () => Response.json({ error: "Email is invalid" }, { status: 400 });
    mocks.sendOtp.mockResolvedValue(failure);
    const res = await requestCode();
    expect(res.status).toBe(400);
    expect(db.otps.has(EMAIL)).toBe(false);
  });

  it("answers 500 when sending throws", async () => {
    mocks.sendOtp.mockRejectedValue(new Error("resend down"));
    const res = await requestCode();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/user/otp (verify a code)", () => {
  it("rejects a malformed request", async () => {
    for (const body of [{ email: EMAIL }, { email: EMAIL, otp: "12345" }, { email: EMAIL, otp: "12345a" }, { email: "x", otp: "123456" }]) {
      const res = await POST(jsonRequest("/api/user/otp", "POST", body));
      expect(res.status).toBe(400);
    }
  });

  it("tells the user when there is no live code", async () => {
    const res = await verify("123456");
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toBe("OTP expired");
  });

  it("rejects a code that is too old even if it is still in the database", async () => {
    seedOtp(11 * 60 * 1000);
    const res = await verify(String(CODE));
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toBe("OTP Expired");
    expect(db.otps.has(EMAIL)).toBe(false);
  });

  it("rejects a wrong code", async () => {
    seedOtp();
    const res = await verify("654321");
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe("OTP Invalid");
    expect(mocks.cookies!.jar.has("token")).toBe(false);
    expect(db.otps.has(EMAIL)).toBe(true); // still usable: the user may mistype
  });

  it("registers a new user as 'Guest' and signs them in", async () => {
    seedOtp();
    const res = await verify(String(CODE), { locale: "en" });

    expect(res.status).toBe(200);
    expect(mocks.userCreate).toHaveBeenCalledWith({
      name: "Guest",
      email: EMAIL,
      id: expect.stringMatching(/^[0-9a-f]{64}$/),
      picture: "",
      preferredLocale: "en",
    });
    const cookie = mocks.cookies!.jar.get("token")!;
    const { id } = jwt.verify(cookie.value as string, secret) as { id: string };
    expect(id).toBe(mocks.userCreate.mock.calls[0][0].id);
  });

  it("defaults new users to Hindi", async () => {
    seedOtp();
    await verify(String(CODE));
    expect(mocks.userCreate.mock.calls[0][0].preferredLocale).toBe("hi");
  });

  it("signs an existing user in without creating a new account", async () => {
    mocks.userFindOne.mockResolvedValue(storedUser);
    seedOtp();

    const res = await verify(String(CODE));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "user-1", email: EMAIL });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    const { id } = jwt.verify(mocks.cookies!.jar.get("token")!.value as string, secret) as { id: string };
    expect(id).toBe("user-1");
  });

  it("issues a one-year, script-proof session cookie", async () => {
    mocks.userFindOne.mockResolvedValue(storedUser);
    seedOtp();
    await verify(String(CODE));
    expect(mocks.cookies!.jar.get("token")).toMatchObject({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 3600,
    });
  });

  it("uses a code only once", async () => {
    mocks.userFindOne.mockResolvedValue(storedUser);
    seedOtp();
    expect((await verify(String(CODE))).status).toBe(200);
    expect((await verify(String(CODE))).status).toBe(401);
  });

  it("clears the attempt counter after a successful sign-in", async () => {
    mocks.userFindOne.mockResolvedValue(storedUser);
    seedOtp();
    await verify("000000");
    await verify("000001");
    expect(db.locks.get(EMAIL)!.tries).toBe(2);
    await verify(String(CODE));
    expect(db.locks.has(EMAIL)).toBe(false);
  });
});

describe("POST /api/user/otp: brute-force protection", () => {
  it("allows four wrong guesses and locks the email on the fifth", async () => {
    seedOtp();
    const wrong = (n: number) => verify(String(100000 + n));

    for (let n = 0; n < 4; n++) {
      const res = await wrong(n);
      expect(res.status, `guess ${n + 1}`).toBe(400);
    }
    const fifth = await wrong(4);

    expect(fifth.status).toBe(429);
    expect(await errorOf(fifth)).toMatch(/too many attempts/i);
    expect(db.otps.has(EMAIL)).toBe(false); // the code is burned
    expect(db.locks.get(EMAIL)!.endTime).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
  });

  it("then refuses even the correct code", async () => {
    seedOtp();
    for (let n = 0; n < 5; n++) await verify(String(100000 + n));

    seedOtp(); // even if a valid code somehow existed
    const res = await verify(String(CODE));

    expect(res.status).toBe(429);
    expect(mocks.cookies!.jar.has("token")).toBe(false);
  });

  it("lets the user in on the last allowed attempt", async () => {
    mocks.userFindOne.mockResolvedValue(storedUser);
    seedOtp();
    for (let n = 0; n < 4; n++) await verify(String(100000 + n));
    const res = await verify(String(CODE));
    expect(res.status).toBe(200);
  });

  it("cannot be bypassed by asking for a fresh code while locked", async () => {
    seedOtp();
    for (let n = 0; n < 5; n++) await verify(String(100000 + n));
    const res = await requestCode();
    expect(res.status).toBe(429);
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it("limits guesses even when they are sent in parallel", async () => {
    mocks.userFindOne.mockResolvedValue(storedUser);
    seedOtp();
    // 12 simultaneous guesses, the right code hidden among the last ones.
    const guesses = [...Array.from({ length: 10 }, (_, n) => String(100000 + n)), String(CODE), String(CODE)];

    const results = await Promise.all(guesses.map((guess) => verify(guess)));

    // Only the first five guesses are ever compared; nothing after that can succeed.
    expect(results.filter((res) => res.status === 200)).toHaveLength(0);
    expect(mocks.cookies!.jar.has("token")).toBe(false);
  });

  it("counts attempts per email address", async () => {
    seedOtp();
    for (let n = 0; n < 5; n++) await verify(String(100000 + n));
    // A different user is unaffected.
    db.otps.set("other@example.com", {
      email: "other@example.com",
      otpHash: generateHash(CODE),
      createdAt: new Date(),
    });
    mocks.userFindOne.mockResolvedValue(storedUser);
    const res = await POST(
      jsonRequest("/api/user/otp", "POST", { email: "other@example.com", otp: String(CODE) }),
    );
    expect(res.status).toBe(200);
  });
});
