import { describe, expect, it, vi } from "vitest";
import respondErr, {
  EMAIL_REGEX,
  generateHash,
  generateUniqueId,
  genResErr,
  isValidEmail,
} from "@/app/api/utils/respondErr";

// The models are only used as types by respondErr.ts, but importing them
// would register Mongoose models, so they are replaced by empty objects.
vi.mock("@/app/api/models/user", () => ({ default: {} }));
vi.mock("@/app/api/models/chat", () => ({ default: {} }));

describe("respondErr", () => {
  it("returns a JSON error body with a 400 status by default", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = respondErr("Something broke");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Something broke" });
  });

  it("honours a custom status code", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(respondErr("nope", 401).status).toBe(401);
    expect(respondErr("boom", 500).status).toBe(500);
  });

  it("genResErr defers building the response until it is called", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const lazy = genResErr("Token not found", 401);
    expect(typeof lazy).toBe("function");
    const res = lazy();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Token not found" });
  });
});

describe("isValidEmail", () => {
  it.each([
    "user@example.com",
    "first.last+tag@sub.domain.co.in",
    "a_b-c%d@host.io",
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "plainaddress",
    "@missing-local.com",
    "missing-at.example.com",
    "no-tld@host",
    "short-tld@host.c",
    "spaces in@host.com",
    "two@@host.com",
  ])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it.each([undefined, null, 42, {}, [], ["a@b.co"]])(
    "rejects non-string value %j",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );

  it("exposes the regex it uses", () => {
    expect(EMAIL_REGEX.test("ok@example.com")).toBe(true);
  });
});

describe("generateHash", () => {
  it("is a deterministic 64 character hex HMAC", () => {
    const a = generateHash("123456");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(generateHash("123456")).toBe(a);
  });

  it("treats numbers and their string form identically", () => {
    expect(generateHash(123456)).toBe(generateHash("123456"));
  });

  it("produces different hashes for different inputs", () => {
    expect(generateHash("123456")).not.toBe(generateHash("123457"));
  });

  it("is keyed with JWT_SECRET", () => {
    const before = generateHash("123456");
    vi.stubEnv("JWT_SECRET", "a-completely-different-secret");
    expect(generateHash("123456")).not.toBe(before);
  });

  it("never contains the plaintext input", () => {
    expect(generateHash("123456")).not.toContain("123456");
  });

  it("verifies a matching hash", () => {
    const hash = generateHash("654321");
    expect(generateHash("654321", hash)).toBe(true);
  });

  it("rejects a hash created for a different input", () => {
    const hash = generateHash("654321");
    expect(generateHash("111111", hash)).toBe(false);
  });

  it("throws (and so never reports a match) for a malformed stored hash", () => {
    expect(() => generateHash("654321", "too-short")).toThrow();
  });
});

describe("generateUniqueId", () => {
  const model = (findOne: ReturnType<typeof vi.fn>) =>
    ({ findOne }) as never;

  it("returns a hex id when nothing collides", async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const id = await generateUniqueId(model(findOne));
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({ id });
  });

  it("looks the id up in the field it was asked for", async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const id = await generateUniqueId(model(findOne), "chatId" as never);
    expect(findOne).toHaveBeenCalledWith({ chatId: id });
  });

  it("generates a new id when the first one is already taken", async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce({ id: "taken again" })
      .mockResolvedValue(null);
    const id = await generateUniqueId(model(findOne));
    expect(findOne).toHaveBeenCalledTimes(3);
    const tried = findOne.mock.calls.map(([query]) => query.id);
    expect(new Set(tried).size).toBe(3);
    expect(tried.at(-1)).toBe(id);
  });
});
