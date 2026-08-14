import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The site's motion language, in one file.
 *
 * Every duration and easing used anywhere on WappiCart resolves to a value
 * here. If a component contains a raw `0.42` or an `ease: "back.out(1.7)"`,
 * it is wrong — a motion system is only a system while the numbers agree.
 *
 * ── The four libraries, and what each one is for ──────────────────────────
 *   GSAP           cinematic timelines — heroes, section sequences
 *   ScrollTrigger  anything driven by scroll position — scrub, pin, parallax
 *   Lenis          smooth scroll, one global instance (see smooth-scroll.tsx)
 *   Motion         React state — filtering, sorting, layout, presence
 *   CSS            hover and simple micro-interaction
 *
 * Nothing here reaches for a second tool to do a job one of those already
 * does well.
 */

/* ── Easing ────────────────────────────────────────────────────────────────
   One curve, expressed three ways because three consumers need three shapes.
   All of them are the same settle: fast out of the gate, long soft landing,
   no overshoot. Nothing on this site bounces or springs past its mark. */

/** For CSS `transition-timing-function` and Tailwind's `ease-(--ease-settle)`. */
export const EASE_SETTLE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/** For Motion's `ease` prop, which wants the four control points. */
export const EASE_SETTLE_POINTS = [0.16, 1, 0.3, 1] as const;

/** For GSAP. `power3.out` is the same shape to within a pixel at these sizes. */
export const EASE_SETTLE = "power3.out";

/** Scrubbed animations are driven by the scrollbar, so they must be linear —
    an eased scrub fights the finger that is doing the easing. */
export const EASE_SCRUB = "none";

/* ── Duration ──────────────────────────────────────────────────────────────
   Seconds, because GSAP counts in seconds. Motion does too. */
export const DURATION = {
  /** Hover, tap, colour changes. */
  quick: 0.26,
  /** The default entrance. Opacity and a short travel. */
  settle: 0.5,
  /** Image and clip-path reveals — they carry more distance, so more time. */
  reveal: 0.7,
  /** The longest thing on the site. Nothing may exceed this. */
  long: 0.9,
} as const;

/** Stagger steps, so a row of six and a headline of twenty agree on cadence. */
export const STAGGER = {
  /** Characters in a headline. */
  char: 0.018,
  /** Words, lines, list rows. */
  line: 0.06,
  /** Cards in a grid. */
  card: 0.08,
} as const;

/* ── Environment ───────────────────────────────────────────────────────────
   Three questions every motion component asks before it does anything. */

/**
 * Motion is a garnish, never the meal.
 *
 * Read at effect time rather than through a hook, because these components
 * animate imperatively and a re-render on a media query change would restart
 * timelines mid-flight. SSR-safe: returns true (no motion) when there is no
 * window, which is the correct default for a server render.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cursor-driven effects — magnetic buttons, pointer parallax — exist only
 * where there is a real pointer. On a phone they are dead weight in the
 * bundle and a hover state that sticks after a tap.
 */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Parallax and scrub travel are scaled down below this width. A 60px drift
 * reads as depth on a 1440px screen and as a layout bug on a 390px one.
 */
export function isCompactViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/** Distance scaling for anything that travels. Mobile gets a third of it. */
export function travelScale(): number {
  return isCompactViewport() ? 0.35 : 1;
}

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * Every motion component sets its start state before the browser paints, which
 * is what `useLayoutEffect` is for — but React logs a warning when it runs
 * during a server render, and these components are server-rendered before they
 * hydrate. This is the standard swap, in one place rather than eight.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ── GSAP registration ─────────────────────────────────────────────────────
   Registering a plugin twice is harmless but registering it in nine
   components means nine places to forget. This is the only call site. */

let registered = false;

/**
 * Call at the top of any effect that uses ScrollTrigger. Idempotent, and a
 * no-op on the server where `document` does not exist.
 */
export function registerScrollTrigger(): typeof ScrollTrigger {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return ScrollTrigger;
}
