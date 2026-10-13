"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type { Content } from "../lib/content";
import { sceneState, type Lang } from "../lib/constants";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

interface HeroProps {
  lang: Lang;
  t: Content["hero"];
  hint: string;
}

export default function Hero({ lang, t, hint }: Readonly<HeroProps>) {
  const root = useRef<HTMLElement>(null);
  const hindi = lang === "hi";

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".hero-a, .hero-b, .hero-hint", { autoAlpha: 0 });
        gsap.set(".hero-brand, .hero-sub", { autoAlpha: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const brand = el.querySelector<HTMLElement>(".hero-brand-text")!;
        // Devanagari letters combine into clusters, so Hindi is revealed word by word instead of letter by letter.
        const split = SplitText.create(brand, { type: hindi ? "words" : "chars" });
        const parts = hindi ? split.words : split.chars;
        // The heading itself becomes visible; its individual pieces are revealed by the timeline below.
        gsap.set(".hero-brand", { autoAlpha: 1 });
        gsap.set(".hero-a", { xPercent: -70, autoAlpha: 0 });
        gsap.set(".hero-b", { xPercent: 70, autoAlpha: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=280%",
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.fromTo(
            parts,
            { autoAlpha: 1, yPercent: 0 },
            { autoAlpha: 0, yPercent: 70, stagger: hindi ? 0.25 : 0.07, duration: 0.55, ease: "back.out(1.6)" },
            2,
          )
          .fromTo(".hero-sub", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0)
          .to(".hero-sub", { autoAlpha: 0, y: 18 }, 2)
          .to(".hero-a, .hero-b", { xPercent: 0, autoAlpha: 1, duration: 1.4, ease: "power2.in" }, 2.14)
          .to(".hero-hint", { autoAlpha: 0, duration: 0.3 }, 2.14)
          .to(".hero-a", { xPercent: -70, autoAlpha: 0, duration: 0.3, ease: "power2.out" }, 2.5)
          .to(".hero-b", { xPercent: 70, autoAlpha: 0, duration: 0.3, ease: "power2.out" }, 2.5)
          .to(sceneState, { dim: 1, duration: 0.9, ease: "power1.in" }, 2.5)
          .to(sceneState, { dim: 0.3, duration: 0.9, ease: "power1.out" }, 4);

        return () => {
          split.revert();
          sceneState.dim = 0.3;
        };
      });
    },
    { scope: root },
  );

  const sideSize = hindi ? "text-[clamp(2.25rem,7.5vw,7rem)]" : "text-[clamp(2.75rem,10vw,9.5rem)]";
  const brandSize = hindi ? "text-[clamp(3.25rem,12vw,11rem)]" : "text-[clamp(3.5rem,15vw,13rem)]";

  return (
    <section
      ref={root}
      id="top"
      className="relative h-svh w-full overflow-hidden"
      style={{ ["--portal" as string]: "min(44svh, 66vw)" }}
    >
      <div className="absolute inset-0 z-20 grid place-items-center px-5 md:px-6 text-center">
        <div>
          <h1
            id="hero-title"
            className={`hero-brand font-display ${brandSize} leading-[0.95] tracking-[-0.02em] text-shadow-2xs`}
          >
            <span className="hero-brand-text text-shadow-lg">{t.brand}</span>
            <span className="sr-only">{t.brandSr}</span>
          </h1>
          <p
            aria-hidden="true"
            className="hero-sub mt-4 font-display text-[clamp(1.25rem,3vw,2.25rem)] text-ivory [text-shadow:0_0_30px_rgba(13,11,30,0.95)]"
          >
            {t.sub}
          </p>
        </div>
      </div>
      <p
        className={`hero-a absolute inset-x-0 top-[9svh] z-10 text-center font-display ${sideSize} leading-[0.92] md:inset-x-auto md:right-[calc(50%+var(--portal)/2+2.5vw)] md:top-1/2 md:-translate-y-1/2 md:text-right opacity-0`}
      >
        {t.a[0]}
        <br />
        {t.a[1]}
      </p>
      <p
        className={`hero-b absolute inset-x-0 bottom-[9svh] z-10 text-center font-display ${sideSize} leading-[0.92] md:inset-x-auto md:bottom-auto md:left-[calc(50%+var(--portal)/2+2.5vw)] md:top-1/2 md:-translate-y-1/2 md:text-left opacity-0`}
      >
        {t.b[0]}
        <br />
        {t.b[1]}
      </p>

      <p className="hero-hint absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-sm text-ivory/70 opacity-0">{hint}</p>
    </section>
  );
}
