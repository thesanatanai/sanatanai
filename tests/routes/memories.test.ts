import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "../helpers/request";

const mocks = vi.hoisted(() => ({ verifyUser: vi.fn(), updateOne: vi.fn() }));

vi.mock("@/app/api/utils/verify", () => ({ default: mocks.verifyUser }));
vi.mock("@/app/api/utils/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/api/models/chat", () => ({ default: {} }));
vi.mock("@/app/api/models/user", () => ({ default: { updateOne: mocks.updateOne } }));

import { DELETE, GET } from "@/app/api/user/memories/route";

const withMemories = (memories?: string[]) => ({ id: "user-1", memories });
const del = (body: string) => DELETE(new Request("http://localhost/api/user/memories", { method: "DELETE", body }));

beforeEach(() => {
  mocks.verifyUser.mockReset().mockResolvedValue(withMemories(["a", "b", "c"]));
  mocks.updateOne.mockReset().mockResolvedValue({});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/user/memories", () => {
  it("lists the memories, longest first", async () => {
    mocks.verifyUser.mockResolvedValue(withMemories(["short", "a much longer memory", "medium one"]));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.json()).toEqual(["a much longer memory", "medium one", "short"]);
  });

  it("returns an empty list for a user without memories", async () => {
    mocks.verifyUser.mockResolvedValue(withMemories(undefined));
    expect(await (await GET()).json()).toEqual([]);
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await GET()).status).toBe(401);
  });
});

describe("DELETE /api/user/memories", () => {
  it("rejects a memory the user does not have", async () => {
    const res = await del("not stored");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request" });
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    mocks.verifyUser.mockResolvedValue(unauthorized());
    expect((await del("a")).status).toBe(401);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("confirms with 'Done' and only touches the signed-in user", async () => {
    const res = await del("b");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Done");
    expect(mocks.updateOne.mock.calls[0][0]).toEqual({ id: "user-1" });
  });

  it("clears the list when the only memory is deleted", async () => {
    mocks.verifyUser.mockResolvedValue(withMemories(["only"]));
    await del("only");
    const { memories } = mocks.updateOne.mock.calls[0][1];
    expect([null, []]).toContainEqual(memories);
  });

  // KNOWN BUG (src/app/api/user/memories/route.ts): `splice()` returns the
  // REMOVED items, and the handler then tests the length of that array
  // (always 1) instead of the remaining list, so it stores `memories: null`.
  // Deleting ONE memory therefore wipes ALL of the user's memories.
  // `it.fails` keeps CI green while the bug exists and fails once it is
  // fixed, which is the cue to remove `.fails`.
  it.fails("keeps the other memories when one is deleted", async () => {
    await del("b");
    expect(mocks.updateOne).toHaveBeenCalledWith({ id: "user-1" }, { memories: ["a", "c"] });
  });
});
