import { MetadataRoute } from "next";

export default function SiteMap(): MetadataRoute.Sitemap {
  return [
    {
      url: "/",
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: "/terms",
      changeFrequency: "monthly",
      lastModified: new Date("09/11/2026"),
      priority: 1,
    },
    {
      url: "/privacy",
      changeFrequency: "monthly",
      lastModified: new Date("09/11/2026"),
      priority: 1,
    },
    {
      url: "/welcome",
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0,
    },
  ];
}
