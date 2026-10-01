"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTilt } from "../hooks/useTilt";
import Icon from "./Lordicon";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface VideoStageProps {
  src: string;
  poster: string;
}

const CHIP_POSITIONS = [
  "left-1 top-[14%] md:-left-8",
  "right-1 top-[46%] md:-right-8",
  "bottom-[-1.1rem] left-[10%]",
];

/**
 * A 16:9 app window floating in 3D. It swings in as you scroll, tilts toward the pointer,
 * and carries three chips at different depths.
 */
export default function VideoStage({ src, poster }: Readonly<VideoStageProps>) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const chips = ["Answers stream in", "Hindi and English", "Free of cost"];
  const [playing, setPlaying] = useState(false);

  useTilt(stage, tilt, { rx: 6, ry: 10 });

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: stage.current,
              start: "top 92%",
              end: "bottom 8%",
              scrub: 0.8,
            },
          })
          .fromTo(
            rig.current,
            { rotationX: 46, rotationY: -22, scale: 0.78 },
            { rotationX: 6, rotationY: 0, scale: 1, ease: "none", duration: 1 },
          )
          .to(rig.current, {
            rotationX: -10,
            rotationY: 8,
            scale: 0.94,
            ease: "none",
            duration: 0.8,
          });

        gsap.utils.toArray<HTMLElement>(".chip").forEach((chip, i) => {
          gsap.set(chip, { z: 90 + i * 25 });
          gsap.to(chip, {
            y: i % 2 ? -12 : 12,
            duration: 2.6 + i * 0.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(rig.current, { rotationX: 6 });
      });
    },
    { scope: root },
  );

  // Play while the frame is on screen, pause when it leaves. Skipped for reduced motion.
  useEffect(() => {
    const el = video.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return (
    <section
      ref={root}
      id="demo"
      className="relative px-5 py-28 md:px-8 md:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <div
          ref={stage}
          className="stage mt-16 md:mt-20"
          style={{ perspective: "1800px" }}
        >
          <div ref={rig} style={{ transformStyle: "preserve-3d" }}>
            <div
              ref={tilt}
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* light behind the window */}
              <div
                aria-hidden="true"
                className="absolute inset-x-[-7%] inset-y-[-14%] rounded-[3rem] bg-[radial-gradient(closest-side,rgba(143,95,208,0.55),rgba(245,154,60,0.16)_62%,transparent)] blur-2xl"
                style={{ transform: "translateZ(-150px)" }}
              />
              {/* edge thickness */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-3xl border border-ivory/10 bg-dusk"
                style={{ transform: "translateZ(-9px)" }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-3xl border border-ivory/5 bg-night"
                style={{ transform: "translateZ(-18px)" }}
              />

              <div
                role="group"
                aria-label="Sanatan AI's Advertisement"
                className="relative overflow-hidden rounded-3xl border border-ivory/25 bg-night shadow-[0_40px_120px_-30px_rgba(143,95,208,0.6)]"
              >
                <div className="flex h-9 items-center gap-2 border-b border-ivory/10 bg-dusk px-4">
                  <span className="size-2.5 rounded-full bg-rose/80" />
                  <span className="size-2.5 rounded-full bg-ember/80" />
                  <span className="size-2.5 rounded-full bg-water/80" />
                  <span className="mx-auto rounded-full bg-night/70 px-4 py-0.5 text-xs text-ivory/60">
                    Sanatan AI
                  </span>
                  <span className="w-15" aria-hidden="true" />
                </div>

                <div className="relative aspect-video bg-night">
                  <video
                    ref={video}
                    src={src}
                    poster={poster || undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label="Sanatan AI Advertisement"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    className="absolute inset-0 size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={playing ? "Pause Video" : "Play Video"}
                    className="absolute inset-0 grid place-items-center"
                  >
                    <span
                      className={`grid size-20 place-items-center rounded-full border border-ivory/40 bg-night/55 text-ivory backdrop-blur transition-opacity duration-300 ${
                        playing ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      <Icon src="play" size={36} />
                    </span>
                  </button>

                  {/* highlight that follows the pointer */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 mix-blend-screen"
                    style={{
                      background:
                        "radial-gradient(600px circle at var(--sx, 50%) var(--sy, 20%), rgba(255,255,255,0.13), transparent 45%)",
                    }}
                  />
                </div>
              </div>

              {chips.map((label, i) => (
                <span
                  key={label}
                  className={`chip absolute z-10 ${CHIP_POSITIONS[i]} rounded-full border border-ivory/25 bg-dusk/85 px-4 py-2 text-sm shadow-[0_12px_40px_-12px_rgba(143,95,208,0.7)]`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
