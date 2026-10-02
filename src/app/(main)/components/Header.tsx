"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Content } from "../lib/content";
import { paths, type Lang } from "../lib/constants";
import Icon from "./Lordicon";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const brand: Record<Lang, string> = { en: "Sanatan AI", hi: "सनातन एआई" };

export default function Header({ lang, t, prefix }: Readonly<{ lang: Lang; t: Content["ui"], prefix?: boolean }>) {
  const [solid, setSolid] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useGSAP(() => {
    gsap.to(bar.current, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.2 } });
  });

  const links = [
    { href: "#about", label: t.nav.about },
    { href: "#features", label: t.nav.features },
    { href: "#demo", label: t.nav.demo },
    { href: "#calendar", label: t.nav.calendar },
    { href: "#faq", label: t.nav.faq },
  ];

  const segment = (l: Lang, label: string) => (
    <a
      key={l}
      href={(prefix ? "/home/" : "") + paths[l]}
      hrefLang={l}
      lang={l}
      aria-current={lang === l ? "page" : undefined}
      className={`px-3 py-1.5 transition-colors ${lang === l ? "bg-ivory text-night" : "text-ivory/80 hover:text-ember"}`}
    >
      {label}
    </a>
  );

  return (
    <>
      <div ref={bar} className="progress" aria-hidden="true" />
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          solid ? "bg-night/75 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label={t.home}>
            <Image src="/192x192.png" alt="Sanatan Logo" width={36} height={36} className="size-9" />
            <span className="hidden font-display text-xl sm:inline">{brand[lang]}</span>
          </a>

          <nav aria-label={t.navLabel} className="hidden items-center gap-7 text-sm text-ivory/80 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-ember">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <nav aria-label={t.langLabel} className="flex items-center gap-2 text-sm">
              <Icon src="language" size={22} className="hidden text-ivory/80 sm:inline-block" target="parent" />
              <div className="flex overflow-hidden rounded-full border border-ivory/25">
                {segment("en", "EN")}
                {segment("hi", "हिं")}
              </div>
            </nav>
            <a
              href="/app"
              className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-night transition-transform hover:scale-105 md:px-5"
            >
              {t.openApp}
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
