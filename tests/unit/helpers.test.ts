import { afterEach, describe, expect, it, vi } from "vitest";
import typed from "@/utils/typed";
import useRefManager, { refManager } from "@/utils/useRefManager";

describe("typed (placeholder typing animation)", () => {
  afterEach(() => vi.useRealTimers());

  it("types a word out, pauses, deletes it, then moves to the next one", () => {
    vi.useFakeTimers();
    const shown: string[] = [];
    const stop = typed(["Hi", "Yo"], (text) => shown.push(text));

    expect(shown).toEqual(["H"]);
    vi.advanceTimersByTime(50);
    expect(shown.at(-1)).toBe("Hi");

    vi.advanceTimersByTime(1000); // pause at the full word, then start deleting
    expect(shown.at(-1)).toBe("H");
    vi.advanceTimersByTime(80);
    expect(shown.at(-1)).toBe("");

    vi.advanceTimersByTime(50); // next word begins
    expect(shown.at(-1)).toBe("Y");
    stop();
  });

  it("cycles back to the first word", () => {
    vi.useFakeTimers();
    const shown: string[] = [];
    const stop = typed(["a", "b"], (text) => shown.push(text));
    vi.advanceTimersByTime(10_000);
    expect(shown).toContain("a");
    expect(shown).toContain("b");
    expect(shown.filter((text) => text === "a").length).toBeGreaterThan(1);
    stop();
  });

  it("stops animating when cleaned up", () => {
    vi.useFakeTimers();
    const setText = vi.fn();
    const stop = typed(["hello"], setText);
    stop();
    const calls = setText.mock.calls.length;
    vi.advanceTimersByTime(60_000);
    expect(setText).toHaveBeenCalledTimes(calls);
  });
});

describe("refManager", () => {
  it("runs callbacks immediately when the element already exists", () => {
    const ref = refManager<string>();
    ref.set("element");
    const callback = vi.fn();
    ref.afterAvail(callback);
    expect(callback).toHaveBeenCalledWith("element");
    expect(ref.current()).toBe("element");
  });

  it("queues callbacks until the element is set, then runs each once", () => {
    const ref = refManager<string>();
    const first = vi.fn();
    const second = vi.fn();
    ref.afterAvail(first);
    ref.afterAvail(second);
    expect(first).not.toHaveBeenCalled();
    expect(ref.current()).toBeNull();

    ref.set("element");
    ref.set("element");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("ignores React's null when an element unmounts", () => {
    const ref = refManager<string>();
    ref.set("element");
    ref.set(null);
    expect(ref.current()).toBe("element");
  });

  it("exposes a hook wrapper", () => {
    expect(typeof useRefManager).toBe("function");
  });
});
