import "@/app/(main)/styles.css";
import type { Viewport } from "next";
import RootShell from "../components/RootShell";
import { viewportConfig } from "../lib/metadata";

export const viewport: Viewport = viewportConfig;

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="en">{children}</RootShell>;
}
