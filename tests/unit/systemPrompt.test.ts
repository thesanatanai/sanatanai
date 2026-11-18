import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { declaredToolNames } from "../helpers/tools";

vi.mock("@/actions/panchang", () => ({
  default: () => "### Today's Panchanga:\n- Tithi: TestTithi",
}));
vi.mock("@tavily/core", () => ({ tavily: () => ({}) }));
vi.mock("@/app/api/models/user", () => ({ default: {} }));

import prompt, { enhancePrompt, namePrompt } from "@/app/api/utils/systemPrompt";
import { getRequestParams } from "@/app/api/chat/search";

describe("system prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T06:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("greets the user by name when it knows it", () => {
    expect(prompt("Shivam", "en", [])).toContain("You can call user Shivam");
  });

  it("says so when there is no name", () => {
    expect(prompt(undefined, "en", [])).toContain("No info related to User's name");
  });

  it("states the preferred language", () => {
    expect(prompt("S", "en", [])).toContain("preferred language is: English");
    expect(prompt("S", "hi", [])).toContain("preferred language is: Hindi");
  });

  it("defaults to Hindi like the rest of the app", () => {
    expect(prompt("S")).toContain("preferred language is: Hindi");
  });

  it("lists every saved memory", () => {
    const text = prompt("S", "en", ["Likes the Gita", "Lives in Jaipur"]);
    expect(text).toContain("Current Memories:");
    expect(text).toContain("Likes the Gita");
    expect(text).toContain("Lives in Jaipur");
    expect(text).not.toContain("no saved memories");
  });

  it("says when there are no memories", () => {
    expect(prompt("S", "en", [])).toContain("User Currently has no saved memories.");
  });

  it("tells the model the current time", () => {
    expect(prompt("S", "en", [])).toContain("Sun, 15 Nov 2026 06:30:00 GMT");
  });

  it("includes today's Panchanga", () => {
    expect(prompt("S", "en", [])).toContain("- Tithi: TestTithi");
  });

  it("is wrapped in a single system_prompt block", () => {
    const text = prompt("S", "en", []);
    expect(text.startsWith("<system_prompt>")).toBe(true);
    expect(text.endsWith("</system_prompt>")).toBe(true);
  });

  it("names every tool the server actually offers, so prompt and tools cannot drift apart", () => {
    const options = getRequestParams({ messages: [] } as never, { role: "user", parts: [] }, undefined, "");
    const declared = declaredToolNames(options.config);
    const text = prompt("S", "en", []);
    for (const name of declared) expect(text).toContain(name);
  });

  it("documents the custom tags the client renders, so prompt and renderer stay in step", () => {
    const text = prompt("S", "en", []);
    for (const tag of ["<gita>", "<canvas>", "<chat-btn>", "<badge"]) {
      expect(text, tag).toContain(tag);
    }
  });

  it("no longer teaches the model the retired [!!block!!] syntax", () => {
    const text = prompt("S", "en", []);
    expect(text).not.toContain("[!!gita!!]");
    expect(text).not.toContain("[!!btn!!]");
  });

});

describe("enhancePrompt", () => {
  it("mentions the user's name when there is one", () => {
    expect(enhancePrompt("Shivam", "en")).toContain("Name of user is **Shivam**");
  });

  it("leaves the user section out without a name", () => {
    expect(enhancePrompt("", "en")).not.toContain("About User");
  });

  it("states the preferred language but follows the message's own language", () => {
    expect(enhancePrompt("", "hi")).toContain("**Preferred language:** Hindi");
    expect(enhancePrompt("", "en")).toContain("**Preferred language:** English");
    expect(enhancePrompt("", "en")).toContain("always follow the language of the user's actual message");
  });

  it("forbids answering the query", () => {
    expect(enhancePrompt("", "en")).toContain("Do not answer it");
  });
});

describe("namePrompt", () => {
  it("asks for a short name and nothing else", () => {
    const text = namePrompt();
    expect(text).toContain("**2–6 words**");
    expect(text).toContain("Return only the chat name");
  });
});
