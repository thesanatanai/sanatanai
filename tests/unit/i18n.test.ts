import { isValidElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { initI18n, locales, t } from "@/utils/i18n";

const en = locales.en as Record<string, unknown>;
const hi = locales.hi as Record<string, unknown>;

/** Names of the {placeholders} inside a translated string. */
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("interface dictionaries", () => {
  it("define exactly the same keys in English and Hindi", () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it("use the same kind of value for every key in both languages", () => {
    const kind = (value: unknown) =>
      Array.isArray(value) ? "list" : isValidElement(value) ? "element" : typeof value;
    for (const key of Object.keys(en)) {
      expect(kind(hi[key]), `value type of "${key}"`).toBe(kind(en[key]));
    }
  });

  it("have no empty translations", () => {
    for (const [name, dictionary] of Object.entries({ en, hi })) {
      for (const [key, value] of Object.entries(dictionary)) {
        if (typeof value === "string") {
          expect(value.trim(), `${name}.${key}`).not.toBe("");
        }
        if (Array.isArray(value)) {
          expect(value.length, `${name}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("use the same {placeholders} in both languages", () => {
    for (const key of Object.keys(en)) {
      if (typeof en[key] === "string" && typeof hi[key] === "string") {
        expect(placeholders(hi[key] as string), `placeholders of "${key}"`).toEqual(
          placeholders(en[key] as string),
        );
      }
    }
  });

  it("offer sample prompts in both languages", () => {
    expect((en.samplePrompts as string[]).length).toBeGreaterThanOrEqual(3);
    expect((hi.samplePrompts as string[]).length).toBeGreaterThanOrEqual(3);
  });
});

describe("t()", () => {
  afterEach(() => initI18n("en"));

  it("translates into the requested language", () => {
    expect(t("languageLabel", undefined, "en")).toBe("Language");
    expect(t("languageLabel", undefined, "hi")).toBe("भाषा");
  });

  it("uses the language set with initI18n when none is given", () => {
    initI18n("hi");
    expect(t("languageLabel")).toBe("भाषा");
    initI18n("en");
    expect(t("languageLabel")).toBe("Language");
  });

  it("fills in {placeholders}", () => {
    expect(t("changedSetting", { setting: "Theme" }, "en")).toContain("Theme");
    expect(t("changedSetting", { setting: "थीम" }, "hi")).toContain("थीम");
    expect(t("changedSetting", { setting: "Theme" }, "en")).not.toContain("{setting}");
  });

  it("falls back to the key itself for an unknown key", () => {
    expect(t("definitelyNotAKey" as never, undefined, "en")).toBe("definitelyNotAKey");
  });

  it("returns lists such as the sample prompts untouched", () => {
    expect(t("samplePrompts", undefined, "en")).toEqual(en.samplePrompts);
  });

  it("falls back to English when initI18n gets an unsupported language", () => {
    initI18n("fr" as never);
    expect(t("languageLabel")).toBe("Language");
  });

});
