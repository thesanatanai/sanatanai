"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { sceneState } from "../lib/constants";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Smooth scrolling, pointer tracking, scroll progress for the 3D scene, card spotlight and heading reveals. */
export default function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | undefined;
    let tick: ((time: number) => void) | undefined;

    if (!reduce) {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const onPointer = (e: PointerEvent) => {
      sceneState.px = (e.clientX / window.innerWidth - 0.5) * 2;
      sceneState.py = (e.clientY / window.innerHeight - 0.5) * 2;

      // Light that follows the pointer inside any element marked .spot
      const card = (e.target as Element | null)?.closest<HTMLElement>(".spot");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // In-page links scroll through Lenis so pinned sections stay in sync.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.getAttribute("href") === "#") return;
      const target = document.querySelector<HTMLElement>(link.getAttribute("href")!);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -40 });
      else target.scrollIntoView();
      history.replaceState(null, "", link.getAttribute("href"));
    };
    document.addEventListener("click", onClick);

    const progress = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        sceneState.page = self.progress;
      },
    });

    // Headings marked data-split reveal line by line, each line rising out of a mask.
    let ctx: gsap.Context | undefined;
    let cancelled = false;
    if (!reduce) {
      document.fonts.ready.then(() => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
            let revealed = false;
            SplitText.create(el, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit(self) {
                // A re-split (resize, late font) must not replay a heading the visitor has already seen.
                if (revealed) return;
                return gsap.from(self.lines, {
                  yPercent: 110,
                  duration: 1.1,
                  ease: "power4.out",
                  stagger: 0.1,
                  scrollTrigger: { trigger: el, start: "top 88%", once: true, onEnter: () => (revealed = true) },
                });
              },
            });
          });
        });
        ScrollTrigger.refresh();
      });
    }

    return () => {
      cancelled = true;
      ctx?.revert();
      progress.kill();
      document.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onPointer);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
