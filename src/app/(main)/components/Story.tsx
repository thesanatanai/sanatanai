"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Content } from "../lib/content";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Story({ t }: Readonly<{ t: Content["story"] }>) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".meet-row").forEach((row) => {
          gsap
            .timeline({ scrollTrigger: { trigger: row, start: "top 92%", end: "top 48%", scrub: 0.6 } })
            .fromTo(row.querySelector(".meet-l"), { xPercent: -45, autoAlpha: 0.12 }, { xPercent: 0, autoAlpha: 1, ease: "power2.out" }, 0)
            .fromTo(row.querySelector(".meet-r"), { xPercent: 45, autoAlpha: 0.12 }, { xPercent: 0, autoAlpha: 1, ease: "power2.out" }, 0)
            .fromTo(row.querySelector(".meet-line"), { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0.2)
            .fromTo(row.querySelector(".meet-dot"), { scale: 0 }, { scale: 1, ease: "back.out(3)" }, 0.85);
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative px-5 py-28 md:px-8 md:py-44">
      <div className="mx-auto max-w-6xl">
        <h2 id="about-title" data-split className="max-w-3xl text-[clamp(2.5rem,6vw,5.25rem)] leading-[1.02]">
          {t.title}
        </h2>
        <p className="mt-8 max-w-[58ch] text-lg text-ivory/80 md:text-xl">{t.body}</p>

        <ul className="mt-20 space-y-3 md:mt-28 md:space-y-6 max-w-screen overflow-hidden" aria-label={t.listLabel}>
          {t.pairs.map(([a, b]) => (
            <li
              key={a}
              className="meet-row grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-display text-[clamp(1.6rem,5.6vw,4.75rem)] leading-tight md:gap-8"
            >
              <span className="meet-l text-right">{a}</span>
              <span aria-hidden="true" className="relative block h-px w-[clamp(2rem,8vw,7rem)]">
                <span className="meet-line absolute inset-0 origin-center bg-ember/70" />
                <span className="meet-dot absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember shadow-[0_0_18px_var(--color-ember)]" />
              </span>
              <span className="meet-r">{b}</span>
              <span className="sr-only">{t.meets.replace("{a}", a).replace("{b}", b)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
