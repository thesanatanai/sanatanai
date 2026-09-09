import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local"
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: "Sanatan AI",
  applicationName: "Sanatan AI",
  authors: {
    name: "Shivam Sharma",
    url: "https://shivamsharma999.github.io",
  },
  creator: "Shivam Sharma",
  publisher: "Sanatan AI",
  openGraph: {
    type: "website",
    title: "Sanatan AI",
    description:
      "SANATAN AI — The Soul of Intelligence. One of the world's most advanced AI assistants, empowering users with authentic knowledge, spiritual guidance, and deep insights into Sanatan Dharma.",
    emails: "shivam8299.sharma@gmail.com",
    siteName: "Sanatan AI",
    locale: "en",
    alternateLocale: "hi",
    images: ["/preview.png", "/icon.png"],
    url: "https://sanatan-ai.vercel.app",
    countryName: "India",
  },
  metadataBase: "https://sanatan-ai.vercel.app",
  keywords: [
    "Sanatan AI",
    "Sanatan chatgpt",
    "AI assiatant",
    "Sanatan",
    "ai",
    "AI",
    "ChatGPT",
    "Gemini",
    "Sanatan gemini",
    "chatbot",
  ],
  description:
    "SANATAN AI — The Soul of Intelligence. One of the world's most advanced AI assistants, empowering users with authentic knowledge, spiritual guidance, and deep insights into Sanatan Dharma.",
  verification: {
    google: "Dm5OMog15ZMCDGVpyuRpkB7H0pgDqb60mUO_Nx3wcek",
  },
};

const poppins = Poppins({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const theSeasons = localFont({
  variable: "--font-the-seasons",
  display: "swap",
  src: [
    {
      path: "./the-seasons/TheSeasons-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./the-seasons/TheSeasons-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./the-seasons/TheSeasons-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./the-seasons/TheSeasons-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./the-seasons/TheSeasons-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./the-seasons/TheSeasons-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
})

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${poppins.className} ${theSeasons.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Sanatan AI" />
        <script
          type="ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Sanatan AI",
              url: "https://sanatan-ai.vercel.app",
              keywords:
                "Sanatan AI, Sanatan chatgpt, AI assiatant, Sanatan, ai, AI, ChatGPT, Gemini, Sanatan gemini, chatbot",
              description:
                "SANATAN AI — The Soul of Intelligence. One of the world's most advanced AI assistants, empowering users with authentic knowledge, spiritual guidance, and deep insights into Sanatan Dharma.",
              author: {
                "@type": "Person",
                name: "Shivam Sharma",
                url: "https://shivamsharma999.github.io",
              },
              publisher: {
                "@type": "Organization",
                name: "Sanatan AI",
              },
              inLanguage: ["en", "hi"],
              genre: ["AI", "Chatbot", "Sanatan Dharma"],
            }),
          }}
        ></script>
      </head>
      <body>
        <GoogleAnalytics gaId="G-104LTZTEH1" />
        {children}
      </body>
    </html>
  );
}
