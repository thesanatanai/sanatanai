import type { Viewport } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local"
import { GoogleAnalytics } from "@next/third-parties/google";
import { buildMetadata } from "./(main)/lib/metadata";

export const metadata = buildMetadata("en");

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
      <body>
        <GoogleAnalytics gaId={process.env.GA_ID || "G-104LTZTEH1"} />
        {children}
      </body>
    </html>
  );
}
