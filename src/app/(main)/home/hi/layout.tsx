import "@/app/(main)/styles.css";
import type { Viewport } from "next";
import { buildMetadata, viewportConfig } from "@/app/(main)/lib/metadata";

export const viewport: Viewport = viewportConfig;
export const metadata = buildMetadata("hi");

export default function HindiLayout({
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
