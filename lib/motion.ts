/**
 * Shared motion vocabulary.
 *
 * The site has one easing curve and a small set of durations. Keeping them
 * here means a GSAP tween and a CSS transition on the same element cannot
 * disagree about how fast "settle" is — `EASE_SETTLE` is the same
 * cubic-bezier as `--ease-settle` in globals.css.
 */

/** cubic-bezier(0.16, 1, 0.3, 1) — fast out, long settle. */
export const EASE_SETTLE = "power4.out";

/** The same curve as four control points, for anything taking a raw bezier. */
export const EASE_SETTLE_POINTS = [0.16, 1, 0.3, 1] as const;

/** A slower, symmetric curve for ambient loops that never "arrive". */
export const EASE_DRIFT = "sine.inOut";

export const DURATION = {
  /** Micro-interactions: hover, underline, icon nudge. */
  quick: 0.26,
  /** Entrances: rise, fade, stagger step. */
  settle: 0.5,
  /** Image and mask reveals. */
  reveal: 0.9,
  /** The cinematic hero beat. */
  cinematic: 1.4,
} as const;

/**
 * True when the visitor has asked the operating system for less motion.
 *
 * Read at call time rather than cached — someone can change it mid-session,
 * and every animated component re-checks on the media query's change event.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * True only on a device that has a real pointer AND has not asked for reduced
 * motion.
 *
 * This gates everything expensive: the cursor, the ambient loops, the mouse
 * parallax, the grain. Nearly every shopper here is on a phone, where a
 * continuous animation costs battery to deliver an effect nobody asked for and
 * a cursor effect cannot be seen at all.
 */
export function canAnimateRich(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: fine)").matches &&
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches
  );
}

/** Frame-rate independent interpolation, for cursor and parallax easing. */
export function damp(current: number, target: number, smoothing: number, deltaMs: number): number {
  return current + (target - current) * (1 - Math.pow(smoothing, deltaMs / 16.667));
}
