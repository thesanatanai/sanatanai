import Image from "next/image";
import type { Content } from "../lib/content";

export default function Footer({ t, externalLabel }: Readonly<{ t: Content["footer"]; externalLabel: string }>) {
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <footer className="relative z-10 border-t border-ivory/10 bg-night/80 px-5 py-12 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <Image src="/192x192.png" alt="" width={32} height={32} className="size-8" />
            <span className="font-display text-xl">Sanatan AI</span>
          </div>
          <p className="mt-4 text-sm text-ivory/65">{t.disclaimer}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm text-ivory/80">
          <a href="/app" {...ext} className="hover:text-ember">
            {t.open}
          </a>
          <a href="https://github.com/thesanatanai/sanatanai" {...ext} className="hover:text-ember">
            {t.code}
            <span className="sr-only"> {externalLabel}</span>
          </a>
          <a href="https://calendar.shivam.click" {...ext} className="hover:text-ember">
            {t.calendar}
            <span className="sr-only"> {externalLabel}</span>
          </a>
          <a href="https://shivamsharma999.github.io/gita" {...ext} className="hover:text-ember">
            {t.gita}
            <span className="sr-only"> {externalLabel}</span>
          </a>
          <a href="https://shivam.click/" {...ext} className="hover:text-ember">
            {t.madeBy}
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-sm text-ivory/55">{t.rights.replace("{year}", String(new Date().getFullYear()))}</p>
    </footer>
  );
}
