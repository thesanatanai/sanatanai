import { MetadataRoute } from "next";

export default function SiteMap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sanatan.shivam.click/",
      lastModified: new Date("10/06/2026"),
    },
    {
      url: "https://sanatan.shivam.click/terms",
      lastModified: new Date("09/11/2026"),
    },
    {
      url: "https://sanatan.shivam.click/privacy",
      lastModified: new Date("09/11/2026"),
    },
    {
      url: "https://sanatan.shivam.click/welcome",
      lastModified: new Date("09/19/2026"),
    },
    {
      url: "https://sanatan.shivam.click/hi",
      lastModified: new Date("10/06/2026"),
    }
  ];
}
