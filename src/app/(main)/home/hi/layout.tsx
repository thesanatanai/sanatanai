import "@/app/(main)/styles.css";
import type { Viewport } from "next";
import RootShell from "@/app/(main)/components/RootShell";
import { buildMetadata, viewportConfig } from "@/app/(main)/lib/metadata";

export const viewport: Viewport = viewportConfig;
export const metadate = buildMetadata("hi");

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="hi">{children}</RootShell>;
}
