import { getContent } from "../lib/content";
import { paths, type Lang } from "../lib/constants";

export default function JsonLd({ lang }: Readonly<{ lang: Lang }>) {
  const t = getContent(lang).meta;
  const url = `https://sanatan.shivam.click${paths[lang]}`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `https://sanatan.shivam.click/#organization`,
        name: "Sanatan AI",
        url: "https://sanatan.shivam.click",
        logo: { "@type": "ImageObject", url: `https://sanatan.shivam.click/logo.png`, width: 626, height: 626 },
        sameAs: ["https://github.com/thesanatanai", "https://calendar.shivam.click", "https://shivamsharma999.github.io/gita"],
      },
      {
        "@type": "WebSite",
        "@id": `https://sanatan.shivam.click/#website`,
        url: "https://sanatan.shivam.click",
        name: "Sanatan AI",
        description: t.description,
        inLanguage: ["en", "hi"],
        publisher: { "@id": `https://sanatan.shivam.click/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: t.title,
        description: t.description,
        inLanguage: lang,
        isPartOf: { "@id": `https://sanatan.shivam.click/#website` },
        about: { "@id": `https://sanatan.shivam.click/#app` },
        primaryImageOfPage: { "@type": "ImageObject", url: `https://sanatan.shivam.click/logo.png` },
      },
      {
        "@type": "WebApplication",
        "@id": `https://sanatan.shivam.click/#app`,
        name: "Sanatan AI",
        alternateName: `Sanatan AI: ${getContent(lang).meta.ogTagline}`,
        url: "https://sanatan.shivam.click/",
        image: `https://sanatan.shivam.click/logo.png`,
        description: t.description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web, Windows",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        inLanguage: ["en", "hi"],
        author: { "@type": "Person", name: "Shivam Sharma", url: "https://shivam.click" },
        publisher: { "@id": `https://sanatan.shivam.click/#organization` },
        subjectOf: [
          { "@type": "WebApplication", "@id": `https://sanatan.shivam.click/#calendar`, name: "Sanatan Calendar", url: "https://calendar.shivam.click" },
          { "@type": "WebApplication", "@id": `https://sanatan.shivam.click/#gita`, name: "Bhagavad Gita", url: "https://shivamsharma999.github.io/gita" },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        inLanguage: lang,
        mainEntity: getContent(lang).faq.items.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // "<" is escaped so the JSON can never close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
