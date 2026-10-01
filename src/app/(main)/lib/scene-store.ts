/**
 * Shared, mutable state between GSAP (which animates it on scroll) and the
 * three.js render loop (which reads it every frame). Kept outside React on
 * purpose so nothing re-renders while scrolling.
 */
export const sceneState = {
  /** Scale multiplier of the mandala. 1 = fits inside the porthole. */
  zoom: 1,
  /** 0..1 progress of the whole page scroll. */
  page: 0,
  /** Brightness multiplier, lowered behind body copy for legibility. */
  dim: 1,
  /** 0..1.5 extra glow, raised by the call to action. */
  boost: 0,
  /** Pointer position, -1..1. */
  px: 0,
  py: 0,
};
