import "@/app/(main)/styles.css";
import type { Viewport } from "next";
import { viewportConfig } from "../lib/metadata";

export const viewport: Viewport = viewportConfig;

export default function EnglishLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('js')",
        }}
      />
      {children}
    </>
  );
}
