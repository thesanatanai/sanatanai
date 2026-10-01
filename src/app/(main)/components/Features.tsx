"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Content } from "../lib/content";
import Lordicon from "./Lordicon";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Features({ t }: Readonly<{ t: Content["features"] }>) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".feature").forEach((item) => {
          gsap.to(item.querySelectorAll(".draw"), {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: "power2.inOut",
            stagger: 0.12,
            scrollTrigger: { trigger: item, start: "top 80%", once: true },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="features" aria-labelledby="features-title" className="relative px-5 py-28 md:px-8 md:py-40">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[5fr_7fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 id="features-title" data-split className="text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05]">
            {t.title}
          </h2>
          <p className="mt-6 max-w-[44ch] text-lg text-ivory/75">{t.body}</p>
        </div>

        <div className="space-y-6 md:space-y-8">
          {t.items.map((f) => (
            <article
              key={f.id}
              className="feature spot items-center grid grid-cols-[3.5rem_1fr] gap-6 rounded-3xl border border-ivory/10 bg-dusk/40 p-6 md:grid-cols-[4.5rem_1fr] md:gap-8 md:p-8"
            >
              <Lordicon src={f.id} target="parent" className="size-14 md:size-18" />
              <div>
                <h3 className="text-3xl md:text-4xl">{f.title}</h3>
                <p className="mt-3 max-w-[52ch] text-lg text-ivory/75">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
