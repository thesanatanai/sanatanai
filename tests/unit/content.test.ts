import { describe, expect, it } from "vitest";
import { languages, otherLang, paths } from "@/app/(main)/lib/constants";
import { getContent } from "@/app/(main)/lib/content";
import { buildMetadata, viewportConfig } from "@/app/(main)/lib/metadata";

type Json = unknown;

/** Reduces a value to its structure: object keys, array lengths, leaf types. */
function shape(value: Json): Json {
  if (Array.isArray(value)) return { length: value.length, item: value.length ? shape(value[0]) : null };
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  }
  return typeof value;
}

/** Every string anywhere in the value. */
function strings(value: Json): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("showcase site content", () => {
  const en = getContent("en");
  const hi = getContent("hi");

  it("has the same structure in English and Hindi", () => {
    // SEO keywords legitimately differ in number between languages.
    const strip = ({ meta, ...rest }: typeof en) => ({
      ...rest,
      meta: { ...meta, keywords: [] },
    });
    expect(shape(strip(hi))).toEqual(shape(strip(en)));
  });

  it("has no empty text", () => {
    for (const [name, content] of Object.entries({ en, hi })) {
      for (const text of strings(content)) {
        expect(text.trim(), `empty string in ${name}`).not.toBe("");
      }
    }
  });

  it("writes the Hindi page in Hindi script", () => {
    expect(hi.hero.sub).toMatch(/[\u0900-\u097F]/);
    expect(en.hero.sub).not.toMatch(/[\u0900-\u097F]/);
  });

  it("has unique feature ids and calendar tab ids", () => {
    for (const content of [en, hi]) {
      const featureIds = content.features.items.map((item) => item.id);
      expect(new Set(featureIds).size).toBe(featureIds.length);
      const tabIds = content.calendar.tabs.map((tab) => tab.id);
      expect(tabIds).toEqual(["today", "month", "muhurta", "festivals"]);
    }
  });

  it("has an answer for every FAQ question", () => {
    for (const content of [en, hi]) {
      expect(content.faq.items.length).toBeGreaterThan(0);
      for (const { q, a } of content.faq.items) {
        expect(q.length).toBeGreaterThan(5);
        expect(a.length).toBeGreaterThan(5);
      }
    }
  });

  it("declares a distinct locale per language", () => {
    expect(en.meta.locale).not.toBe(hi.meta.locale);
  });
});

describe("language helpers", () => {
  it("supports English and Hindi", () => {
    expect([...languages]).toEqual(["en", "hi"]);
  });

  it("maps each language to its public path", () => {
    expect(paths).toEqual({ en: "/", hi: "/hi" });
  });

  it("finds the other language", () => {
    expect(otherLang("en")).toBe("hi");
    expect(otherLang("hi")).toBe("en");
  });
});

describe("buildMetadata", () => {
  it.each(["en", "hi"] as const)("builds complete SEO metadata for %s", (lang) => {
    const content = getContent(lang);
    const metadata = buildMetadata(lang);

    expect(metadata.title).toBe(content.meta.title);
    expect(metadata.description).toBe(content.meta.description);
    expect(metadata.keywords).toEqual(content.meta.keywords);
    expect(String(metadata.metadataBase)).toBe("https://sanatan.shivam.click/");
    expect(metadata.alternates?.canonical).toBe(paths[lang]);
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: paths[lang],
      title: content.meta.title,
      locale: content.meta.locale,
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("links the two languages to each other with hreflang", () => {
    const { alternates } = buildMetadata("en");
    expect(alternates?.languages).toEqual({ en: "/", hi: "/hi", "x-default": "/" });
    expect(buildMetadata("hi").alternates?.languages).toEqual(alternates?.languages);
  });

  it("advertises the other language as the alternate Open Graph locale", () => {
    expect(buildMetadata("en").openGraph).toMatchObject({
      alternateLocale: [getContent("hi").meta.locale],
    });
    expect(buildMetadata("hi").openGraph).toMatchObject({
      alternateLocale: [getContent("en").meta.locale],
    });
  });

  it("uses a dark viewport theme", () => {
    expect(viewportConfig).toMatchObject({ colorScheme: "dark", width: "device-width" });
  });
});
