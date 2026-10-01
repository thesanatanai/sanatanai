export type Item = { title: string; body: string };

export interface Content {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    locale: string;
    ogBrand: string;
    ogTagline: string;
    ogSub: string;
    ogAlt: string;
  };
  ui: {
    skip: string;
    openApp: string;
    scrollHint: string;
    home: string;
    external: string;
    navLabel: string;
    langLabel: string;
    nav: { about: string; features: string; demo: string; calendar: string; faq: string };
  };
  hero: {
    a: [string, string];
    b: [string, string];
    brand: string;
    brandSr: string;
    sub: string;
  };
  story: { title: string; body: string; listLabel: string; pairs: [string, string][]; meets: string };
  features: { title: string; body: string; items: (Item & { id: string })[] };
  marquee: string[];
  inside: {
    title: string;
    body: string;
    items: Item[];
    chatLabel: string;
    chatNote: string;
    chatLang: string;
  };
  family: { title: string; body: string };
  calendar: {
    name: string;
    title: string;
    body: string;
    points: string[];
    note: string;
    visit: string;
    screensLabel: string;
    tabs: { id: "today" | "month" | "muhurta" | "festivals"; label: string; alt: string }[];
    phoneAlt: string;
  };
  gita: {
    name: string;
    title: string;
    body: string;
    tags: string[];
    visit: string;
    viewRepo: string;
    imageAlt: string;
  };
  stack: { title: string; body: string; groups: { group: string; items: string[] }[] };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { title: string; body: string; button: string; code: string };
  footer: { disclaimer: string; open: string; code: string; calendar: string; gita: string; madeBy: string; rights: string };
}
