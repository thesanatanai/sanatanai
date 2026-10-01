import "@/app/globals.css";
import type { Lang } from "../lib/i18n";

/** The <html> element for one language. Each language has its own root layout so <html lang> is correct in the served HTML. */
export default function RootShell({ lang, children }: Readonly<{ lang: Lang; children: React.ReactNode }>) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
