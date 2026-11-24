import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { initI18n, Language, useT } from "@/utils/i18n";
import { setApp } from "../helpers/stores";

afterEach(() => initI18n("en"));

describe("initI18n", () => {
  it("sets the document language", () => {
    initI18n("hi");
    expect(document.documentElement.lang).toBe("hi");
    initI18n("en");
    expect(document.documentElement.lang).toBe("en");
  });
});

describe("<Language />", () => {
  it("renders the text in the user's language", () => {
    setApp({ language: "hi" });
    render(<Language need="languageLabel" />);
    expect(screen.getByText("भाषा")).toBeDefined();
  });

  it("re-renders in English for English users", () => {
    setApp({ language: "en" });
    render(<Language need="languageLabel" />);
    expect(screen.getByText("Language")).toBeDefined();
  });

  it("substitutes variables", () => {
    render(<Language need="changedSetting" vars={{ setting: "Theme" }} />);
    expect(screen.getByText(/Theme/)).toBeDefined();
    expect(screen.queryByText(/\{setting\}/)).toBeNull();
  });
});

describe("useT", () => {
  it("returns a translator bound to the user's language", () => {
    setApp({ language: "hi" });
    const hindi = renderHook(() => useT());
    expect(hindi.result.current("languageLabel")).toBe("भाषा");
    setApp({ language: "en" });
    const english = renderHook(() => useT());
    expect(english.result.current("languageLabel")).toBe("Language");
  });

  it("follows a language change made while it is mounted", () => {
    const { result } = renderHook(() => useT());
    expect(result.current("languageLabel")).toBe("Language");
    act(() => setApp({ language: "hi" }));
    expect(result.current("languageLabel")).toBe("भाषा");
  });
});
