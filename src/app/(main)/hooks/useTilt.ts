"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";

/**
 * Tilts `target` toward the pointer while it moves over `container`, and publishes the pointer position
 * as --sx / --sy on the container (used for a moving highlight). Only runs for a mouse or trackpad and
 * when the visitor has not asked for reduced motion.
 */
export function useTilt(
  container: RefObject<HTMLElement | null>,
  target: RefObject<HTMLElement | null>,
  { rx = 8, ry = 12 }: { rx?: number; ry?: number } = {},
) {
  useEffect(() => {
    const box = container.current;
    const el = target.current;
    if (!box || !el) return;

    const mm = gsap.matchMedia();
    mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const toX = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" });
      const toY = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });

      const move = (e: PointerEvent) => {
        const r = box.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        toY(px * ry * 2);
        toX(-py * rx * 2);
        box.style.setProperty("--sx", `${(px + 0.5) * 100}%`);
        box.style.setProperty("--sy", `${(py + 0.5) * 100}%`);
      };
      const leave = () => {
        toX(0);
        toY(0);
      };

      box.addEventListener("pointermove", move);
      box.addEventListener("pointerleave", leave);
      return () => {
        box.removeEventListener("pointermove", move);
        box.removeEventListener("pointerleave", leave);
      };
    });

    return () => mm.revert();
  }, [container, target, rx, ry]);
}
