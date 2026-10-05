"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0 fill-ember md:size-8">
      <path d="M12 1.5l2.5 6.6 6.9-2.7-2.7 6.9 6.6 2.5-6.6 2.5 2.7 6.9-6.9-2.7L12 22.5l-2.5-6.6-6.9 2.7 2.7-6.9L.7 12l6.6-2.5-2.7-6.9 6.9 2.7L12 1.5z" />
    </svg>
  );
}

function Row({ items, hidden = false }: Readonly<{ items: string[]; hidden?: boolean }>) {
  return (
    <ul className="marquee-copy" aria-hidden={hidden || undefined}>
      {items.map((word, i) => (
        <li key={word} className="flex items-center">
          <span className={`marquee-word ${i % 2 ? "outline" : ""}`}>{word}</span>
          <Star />
        </li>
      ))}
    </ul>
  );
}

/** A band of key phrases that drifts sideways, speeds up with the scroll and reverses when you scroll back up. */
export default function Marquee({ items }: Readonly<{ items: string[] }>) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const track = root.current!.querySelector<HTMLElement>(".marquee-track")!;
        const drift = gsap.to(track, { xPercent: -50, duration: 46, ease: "none", repeat: -1 });
        const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
        let settle: gsap.core.Tween | undefined;

        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate(self) {
            const dir = self.direction;
            const v = self.getVelocity();
            gsap.to(drift, { timeScale: dir * (1 + Math.min(Math.abs(v) / 350, 6)), duration: 0.25, overwrite: true });
            skewTo(gsap.utils.clamp(-6, 6, v / -250));
            settle?.kill();
            settle = gsap.delayedCall(0.14, () => {
              skewTo(0);
              gsap.to(drift, { timeScale: dir, duration: 1.2 });
            });
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative z-10 overflow-hidden border-y border-ivory/10 bg-night/40 py-4 md:py-6">
      <div className="marquee-track">
        <Row items={items} />
        <Row items={items} hidden />
      </div>
    </div>
  );
}
