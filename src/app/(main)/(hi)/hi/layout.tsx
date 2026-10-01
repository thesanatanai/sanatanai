import "@/app/(main)/styles.css";
import type { Viewport } from "next";
import RootShell from "../../components/RootShell";
import { buildMetadata, viewportConfig } from "../../lib/metadata";

export const viewport: Viewport = viewportConfig;
export const metadata = buildMetadata("hi");

export default function HindiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="hi">{children}</RootShell>;
}
