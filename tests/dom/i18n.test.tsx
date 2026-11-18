import { renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { initI18n, Language, useT } from "@/utils/i18n";
import { makeAll, renderWithContexts } from "../helpers/contexts";
import type { ReactNode } from "react";
import { All } from "@/app/(root)/AllContext";

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
    renderWithContexts(<Language need="languageLabel" />, {
      all: makeAll({ language: "hi" }),
    });
    expect(screen.getByText("भाषा")).toBeDefined();
  });

  it("re-renders in English for English users", () => {
    renderWithContexts(<Language need="languageLabel" />, {
      all: makeAll({ language: "en" }),
    });
    expect(screen.getByText("Language")).toBeDefined();
  });

  it("substitutes variables", () => {
    renderWithContexts(
      <Language need="changedSetting" vars={{ setting: "Theme" }} />,
    );
    expect(screen.getByText(/Theme/)).toBeDefined();
    expect(screen.queryByText(/\{setting\}/)).toBeNull();
  });
});

describe("useT", () => {
  const wrapperFor = (language: "en" | "hi") =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <All.Provider value={makeAll({ language })}>{children}</All.Provider>
      );
    };

  it("returns a translator bound to the user's language", () => {
    const hindi = renderHook(() => useT(), { wrapper: wrapperFor("hi") });
    expect(hindi.result.current("languageLabel")).toBe("भाषा");
    const english = renderHook(() => useT(), { wrapper: wrapperFor("en") });
    expect(english.result.current("languageLabel")).toBe("Language");
  });
});
