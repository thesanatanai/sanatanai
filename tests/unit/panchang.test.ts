import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tithiNames } from "@ishubhamx/panchangam-js";
import getPanchang, { getUpcomingFestivals } from "@/actions/panchang";

// These tests use the real Panchanga library with a fixed clock. They check
// the shape of what the model is told, not astronomical values, so a library
// patch release that refines a calculation does not break them.
describe("getPanchang", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T06:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("describes today's tithi, month, paksha and festivals", () => {
    const text = getPanchang();
    expect(text).toContain("### Today's Panchanga:");
    expect(text).toMatch(/- Tithi: \S+/);
    expect(text).toMatch(/- Month: .+ \((Shukla|Krishna) Paksha\)/);
    expect(text).toContain("- Festivals Today:");
  });

  it("reports a tithi that exists in the library's list", () => {
    const tithi = /- Tithi: (\S+)/.exec(getPanchang())![1];
    expect(tithiNames).toContain(tithi);
  });

  it("gives the same answer for the same moment", () => {
    expect(getPanchang()).toBe(getPanchang());
  });

  it("changes as the days change", () => {
    const today = getPanchang();
    vi.setSystemTime(new Date("2026-11-22T06:00:00Z"));
    expect(getPanchang()).not.toBe(today);
  });
});

describe("getUpcomingFestivals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T06:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("lists festivals with their dates in the extended format", () => {
    const text = getUpcomingFestivals();
    expect(typeof text).toBe("string");
    expect(text).toContain("date (start):");
    expect(text).toContain("category:");
  });
});
