import type { Metadata, Viewport } from "next";
import { getContent } from "./content";
import { otherLang, paths, type Lang } from "./i18n";

export const viewportConfig: Viewport = {
  themeColor: "#0d0b1e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export function buildMetadata(lang: Lang): Metadata {
  const t = getContent(lang);
  const path = paths[lang];

  return {
    metadataBase: new URL("https://sanatan.shivam.click"),
    title: t.meta.title,
    description: t.meta.description,
    keywords: t.meta.keywords,
    applicationName: "Sanatan AI",
    authors: [{ name: "Shivam Sharma", url: "https://shivam.click" }],
    creator: "Shivam Sharma",
    publisher: "Sanatan AI",
    category: "technology",
    // Each language is its own canonical page and points at the other one with hreflang.
    alternates: {
      canonical: path,
      languages: { en: paths.en, hi: paths.hi, "x-default": paths.en },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: "Sanatan AI",
      title: t.meta.title,
      description: t.meta.description,
      locale: t.meta.locale,
      alternateLocale: [getContent(otherLang(lang)).meta.locale],
    emails: "shivam8299.sharma@gmail.com",
    images: "/desktop.png",
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    appleWebApp: { capable: true, title: "Sanatan AI", statusBarStyle: "black-translucent" },
  };
}
