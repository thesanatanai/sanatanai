import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanatan AI",
    short_name: "Sanatan AI",
    orientation: "any",
    display: "standalone",
    start_url: "/",
    id: "/",
    scope: "/",
     categories: ["education", "productivity"],
    lang: "en",
    theme_color: "#000000",
    background_color: "#000000",
    dir: "ltr",
    prefer_related_applications: false,
    description:
      "SANATAN AI — The Soul of Intelligence. One of the world's most advanced AI assistants, empowering users with authentic knowledge, spiritual guidance, and deep insights into Sanatan Dharma.",
    screenshots: [
      {
        src: "/desktop-terms.png",
        sizes: "1366x768",
        type: "image/png",
        form_factor: "wide",
        label: "Terms section view of Sanatan AI",
      },
      {
        src: "/desktop.png",
        sizes: "1366x768",
        type: "image/png",
        form_factor: "wide",
        label: "Desktop view of Sanatan AI",
      },
      {
        src: "/desktop2.png",
        sizes: "1366x768",
        type: "image/png",
        form_factor: "wide",
        label: "Chats view of Sanatan AI",
      },
      {
        src: "/mobile.png",
        sizes: "490x768",
        type: "image/png",
        form_factor: "narrow",
        label: "Hindi view of Sanatan AI",
      },
      {
        src: "/mobile1.png",
        sizes: "490x768",
        type: "image/png",
        form_factor: "narrow",
        label: "Terms section view of Sanatan AI",
      },
      {
        src: "/mobile2.png",
        sizes: "490x768",
        type: "image/png",
        form_factor: "narrow",
        label: "Mobile view of Sanatan AI",
      },
    ],
    icons: [
      {
        src: "192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Continue to Sanatan AI",
        short_name: "Chat",
        url: "/",
        description: "Starts Sanatan AI application",
        icons: [
          {
            src: "192x192.png",
            type: "image/png",
            sizes: "192x192",
          },
        ],
      },
      {
        name: "Logout from Sanatan AI",
        short_name: "Logout",
        url: "/welcome?logout=true",
        description: "Logs out of Sanatan AI application",
        icons: [
          {
            src: "192x192.png",
            type: "image/png",
            sizes: "192x192",
          },
        ],
      },
    ],
  };
}
