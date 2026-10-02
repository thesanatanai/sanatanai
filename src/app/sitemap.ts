import { MetadataRoute } from "next";

export default function SiteMap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sanatan.shivam.click/",
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: "https://sanatan.shivam.click/terms",
      changeFrequency: "monthly",
      lastModified: new Date("09/11/2026"),
      priority: 1,
    },
    {
      url: "https://sanatan.shivam.click/privacy",
      changeFrequency: "monthly",
      lastModified: new Date("09/11/2026"),
      priority: 1,
    },
    {
      url: "https://sanatan.shivam.click/welcome",
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0,
    },
  ];
}
