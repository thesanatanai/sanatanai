"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Content } from "../lib/content";
import { useTilt } from "../hooks/useTilt";
import ButtonLink from "./ButtonLink";
import Icon from "./Lordicon";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Where each screen sits relative to the front one (0 = front, then next, far back, previous). */
const SLOTS = [
  { x: 0, z: 0, ry: 0, s: 1, o: 1 },
  { x: 17, z: -170, ry: -16, s: 0.88, o: 0.55 },
  { x: 0, z: -340, ry: 0, s: 0.76, o: 0 },
  { x: -17, z: -170, ry: 16, s: 0.88, o: 0.55 },
];

interface CalendarShowcaseProps {
  t: Content["calendar"];
  url: string;
  externalLabel: string;
}

export default function CalendarShowcase({ t, url, externalLabel }: Readonly<CalendarShowcaseProps>) {
  const root = useRef<HTMLDivElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLButtonElement | null)[]>([]);
  const first = useRef(true);
  const [active, setActive] = useState(0);
  const count = t.tabs.length;

  useTilt(deck, tilt, { rx: 5, ry: 9 });

  // Arrange the screens whenever the active one changes.
  useGSAP(
    () => {
      const instant = first.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      layers.current.forEach((el, i) => {
        if (!el) return;
        const slot = SLOTS[(i - active + count) % count];
        gsap.to(el, {
          xPercent: slot.x,
          z: slot.z,
          rotationY: slot.ry,
          scale: slot.s,
          opacity: slot.o,
          zIndex: count - ((i - active + count) % count),
          duration: instant ? 0 : 0.9,
          ease: "power3.inOut",
        });
      });
      first.current = false;
    },
    { dependencies: [active], scope: root },
  );

  // Swing the deck in on scroll, and float the phone.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          rig.current,
          { rotationX: 16, rotationY: 26, scale: 0.86, y: 40 },
          {
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: { trigger: deck.current, start: "top 90%", end: "top 40%", scrub: 0.8 },
          },
        );
        gsap.set(".phone", { z: 120 });
        gsap.to(".phone", { y: -14, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="grid gap-14 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
      <div>
        <div className="flex items-center gap-3">
          <Icon src="calendar" size={44} />
          <h3 className="text-3xl md:text-4xl">{t.name}</h3>
        </div>
        <p className="mt-6 font-display text-2xl text-ember md:text-3xl">{t.title}</p>
        <p className="mt-5 max-w-[54ch] text-lg text-ivory/80">{t.body}</p>

        <ul className="mt-8 space-y-3 text-ivory/85">
          {t.points.map((point) => (
            <li key={point} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.7em] size-2 shrink-0 rotate-45 bg-ember" />
              <span className="max-w-[52ch]">{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[52ch] text-sm text-ivory/60">{t.note}</p>

        <div className="mt-9">
          <ButtonLink href={url} external externalLabel={externalLabel} icon="arrow">
            {t.visit}
          </ButtonLink>
        </div>
      </div>

      <div>
        <div ref={deck} className="deck relative mx-auto w-full max-w-180" style={{ perspective: "1500px" }}>
          <div ref={rig} style={{ transformStyle: "preserve-3d" }}>
            <div ref={tilt} className="relative aspect-video" style={{ transformStyle: "preserve-3d" }}>
              <div
                aria-hidden="true"
                className="absolute inset-[-10%] rounded-[3rem] bg-[radial-gradient(closest-side,rgba(245,154,60,0.32),rgba(196,80,143,0.14)_60%,transparent)] blur-2xl"
                style={{ transform: "translateZ(-380px)" }}
              />
              {t.tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  ref={(el) => {
                    layers.current[i] = el;
                  }}
                  type="button"
                  disabled={i === active}
                  onClick={() => setActive(i)}
                  aria-label={tab.label}
                  className="absolute inset-0 block cursor-pointer overflow-hidden rounded-2xl border border-ivory/25 bg-night shadow-[0_30px_90px_-25px_rgba(0,0,0,0.9)] disabled:cursor-default"
                >
                  <Image
                    src={`/calendar/${tab.id}.webp`}
                    alt={i === active ? tab.alt : ""}
                    width={1280}
                    height={720}
                    unoptimized
                    draggable={false}
                    className="size-full select-none object-cover"
                  />
                </button>
              ))}

              <div
                className="phone absolute -bottom-6 -right-2 z-10 w-[24%] overflow-hidden rounded-[1.4rem] border-[3px] border-ivory/30 bg-night shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] md:-right-8"
                aria-hidden="false"
              >
                <Image src="/calendar/phone.webp" alt={t.phoneAlt} width={360} height={606} unoptimized draggable={false} className="block h-auto w-full select-none" />
              </div>
            </div>
          </div>
        </div>

        <div role="group" aria-label={t.screensLabel} className="mt-10 flex flex-wrap justify-center gap-2 lg:mt-12">
          {t.tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={`rounded-full border px-5 py-2 text-sm transition-colors ${
                i === active ? "border-ember bg-ember text-night" : "border-ivory/25 text-ivory/80 hover:border-ember hover:text-ember"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
