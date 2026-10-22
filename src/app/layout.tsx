import type { Viewport } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import { buildMetadata } from "./(main)/lib/metadata";
import Analytics from "@/components/Analytics";

export const metadata = buildMetadata("en");

const poppins = Poppins({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const theSeasons = localFont({
  variable: "--font-the-seasons",
  display: "swap",
  fallback: [], // Fallbacks are handled in css
  preload: true,
  src: [
    {
      path: "./the-seasons/TheSeasons-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./the-seasons/TheSeasons-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

const theSeasonsTemp = localFont({
  variable: "--font-season",
  preload: false,
  display: "swap",
  fallback: [], // Fallbacks are handled in css
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
      path: "./the-seasons/TheSeasons-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./the-seasons/TheSeasons-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
});

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
    <html className={`h-full antialiased ${poppins.className} ${theSeasons.variable} ${theSeasonsTemp.variable}`}>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
