"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Content } from "../lib/content";
import { sceneState } from "../lib/constants";
import ButtonLink from "./ButtonLink";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Cta({ t, externalLabel }: Readonly<{ t: Content["cta"]; externalLabel: string }>) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      // The mandala glows brighter as the visitor reaches the end of the page.
      ScrollTrigger.create({
        trigger: el,
        start: "top 60%",
        end: "bottom bottom",
        onToggle: (self) =>
          gsap.to(sceneState, { dim: self.isActive ? 0.55 : 0.3, boost: self.isActive ? 0.6 : 0, duration: 1.2 }),
      });

      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const btn = el.querySelector<HTMLElement>(".btn");
        if (!btn) return;
        const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" });
        const yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
        };
        const enter = () => gsap.to(sceneState, { boost: 1.4, duration: 0.6 });
        const leave = () => {
          xTo(0);
          yTo(0);
          gsap.to(sceneState, { boost: 0.6, duration: 0.8 });
        };
        btn.addEventListener("pointermove", move);
        btn.addEventListener("pointerenter", enter);
        btn.addEventListener("pointerleave", leave);
        return () => {
          btn.removeEventListener("pointermove", move);
          btn.removeEventListener("pointerenter", enter);
          btn.removeEventListener("pointerleave", leave);
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="start" aria-labelledby="cta-title" className="relative px-5 py-32 text-center md:px-8 md:py-48">
      <div className="mx-auto max-w-4xl">
        <h2 id="cta-title" data-split className="text-[clamp(2.75rem,8vw,7rem)] leading-none">
          {t.title}
        </h2>
        <p className="mx-auto mt-6 max-w-[46ch] text-lg text-ivory/80 md:text-xl">{t.body}</p>
        <div className="mt-12 flex flex-col items-center justify-center gap-5">
          <ButtonLink href="https://sanatan.shivam.click/app" className="py-1 pl-1">
            {t.button}
          </ButtonLink>
          <a href="https://github.com/thesanatanai/sanatanai" target="_blank" rel="noopener noreferrer" className="text-ivory/80 underline decoration-ivory/30 underline-offset-4 hover:text-ember">
            {t.code}
            <span className="sr-only"> {externalLabel}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
