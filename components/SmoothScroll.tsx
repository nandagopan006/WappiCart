"use client";

import { useEffect, useRef, useState } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "lenis/dist/lenis.css";

/**
 * Smoothed wheel scrolling, and the single place Lenis and ScrollTrigger are
 * taught about each other.
 *
 * Lenis is deliberately NOT initialised in two cases:
 *
 * 1. Coarse pointers. A smooth-scroll library takes over the browser's native
 *    scrolling; on a phone that means fighting the operating system, and it
 *    reads as lag rather than polish. Almost every shopper here is on a phone,
 *    so the phone gets native scroll and the desktop gets the garnish.
 * 2. Reduced motion. Smoothing is motion, and it is the kind that runs while
 *    someone is trying to read.
 *
 * ── Why the two libraries have to be introduced ──────────────────────────
 * Lenis does not move the scrollbar; it translates the page and reports its
 * own position. ScrollTrigger, left alone, listens for native scroll events
 * that now fire at the wrong times. The result is scroll-linked animation that
 * lags a frame or two behind the content it is pinned to — the exact jitter
 * that makes a site feel cheap.
 *
 * The fix is two lines and an ordering rule: Lenis tells ScrollTrigger to
 * update on every one of its own ticks, and GSAP's ticker drives Lenis' RAF so
 * both run inside one animation frame instead of two competing ones.
 *
 * Rendering: `<ReactLenis root>` with no children binds to the window and
 * renders no DOM at all, so mounting and unmounting it never touches the page
 * tree. That is what lets the eligibility check live in an effect without the
 * whole app remounting once it resolves.
 */

const LENIS_OPTIONS = {
  duration: 1.1,
  /* Exponential ease-out: fast off the wheel, long settle. */
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  /* Never smooth touch input — see note 1 above. */
  syncTouch: false,
  touchMultiplier: 1.5,
} as const;

export function SmoothScroll() {
  const [smooth, setSmooth] = useState(false);
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setSmooth(!coarsePointer.matches && !reducedMotion.matches);

    update();
    coarsePointer.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);

    return () => {
      coarsePointer.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!smooth) return;
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    gsap.registerPlugin(ScrollTrigger);

    /* Every Lenis tick is a scroll position ScrollTrigger has not seen yet. */
    lenis.on("scroll", ScrollTrigger.update);

    /* Positions moved during the entrance, so ScrollTrigger's cached start and
       end points need recalculating once everything has settled. */
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      window.clearTimeout(refresh);
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, [smooth]);

  if (!smooth) return null;

  /* ── Why Lenis keeps its own RAF ─────────────────────────────────────────
     The documented GSAP pairing is `autoRaf: false` plus `gsap.ticker.add`, so
     both libraries share one frame loop. It is genuinely tidier, and it is the
     wrong trade here.

     Lenis takes over the wheel the moment it initialises. If the handoff to
     GSAP's ticker does not complete — the ref not yet populated, the effect
     torn down by a fast route change, anything at all — nothing advances Lenis
     and the page cannot be scrolled by any means. That is a dead site, caused
     by an optimisation worth one frame of overhead.

     So Lenis drives itself, and ScrollTrigger simply listens. The cost is a
     second RAF loop. The benefit is that scrolling cannot break. */
  return <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS} />;
}
