import { beforeEach, describe, expect, it, vi } from "vitest";

const connect = vi.hoisted(() => vi.fn());
vi.mock("mongoose", () => ({ default: { connect } }));

/** db.ts keeps its connection in module state and on globalThis. */
async function loadDb() {
  vi.resetModules();
  Reflect.deleteProperty(globalThis, "mongoose");
  return (await import("@/app/api/utils/db")).default;
}

beforeEach(() => {
  connect.mockReset();
  connect.mockResolvedValue({ connected: true });
});

describe("dbConnect: configuration", () => {
  it("refuses to load without a MongoDB connection string", async () => {
    vi.stubEnv("MONGO_URI", "");
    await expect(loadDb()).rejects.toThrow("MONGO_URI");
  });

  it("connects with MONGO_URI", async () => {
    vi.stubEnv("MONGO_URI", "mongodb://prod/db");
    const dbConnect = await loadDb();
    await dbConnect();
    expect(connect).toHaveBeenCalledWith("mongodb://prod/db");
  });

  it("prefers MONGO_DEV while developing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MONGO_URI", "mongodb://prod/db");
    vi.stubEnv("MONGO_DEV", "mongodb://localhost/dev");
    const dbConnect = await loadDb();
    await dbConnect();
    expect(connect).toHaveBeenCalledWith("mongodb://localhost/dev");
  });

  it("falls back to MONGO_URI in development when MONGO_DEV is not set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MONGO_URI", "mongodb://prod/db");
    vi.stubEnv("MONGO_DEV", undefined);
    const dbConnect = await loadDb();
    await dbConnect();
    expect(connect).toHaveBeenCalledWith("mongodb://prod/db");
  });

  it("ignores MONGO_DEV outside development, so production can never use it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MONGO_URI", "mongodb://prod/db");
    vi.stubEnv("MONGO_DEV", "mongodb://localhost/dev");
    const dbConnect = await loadDb();
    await dbConnect();
    expect(connect).toHaveBeenCalledWith("mongodb://prod/db");
  });
});

describe("dbConnect: connection reuse", () => {
  it("connects once and reuses the connection", async () => {
    const dbConnect = await loadDb();
    const first = await dbConnect();
    const second = await dbConnect();
    expect(second).toBe(first);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("lets simultaneous callers share one connection attempt", async () => {
    const dbConnect = await loadDb();
    await Promise.all([dbConnect(), dbConnect(), dbConnect()]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("tries again after a failed attempt instead of caching the failure", async () => {
    const dbConnect = await loadDb();
    connect.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(dbConnect()).rejects.toThrow("ECONNREFUSED");
    await expect(dbConnect()).resolves.toEqual({ connected: true });
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
