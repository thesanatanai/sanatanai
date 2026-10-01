export const languages = ["en", "hi"] as const;
export type Lang = (typeof languages)[number];

/** Public path of each language version. English is the default and lives at the root. */
export const paths: Record<Lang, string> = { en: "/", hi: "/hi" };

export const otherLang = (lang: Lang): Lang => (lang === "en" ? "hi" : "en");
