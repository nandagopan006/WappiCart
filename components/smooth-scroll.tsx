"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";

import { prefersReducedMotion, registerScrollTrigger } from "@/lib/motion";

/**
 * The one global scroll system. Mounted once in the root layout and nowhere
 * else — a second Lenis instance means two rAF loops fighting over the same
 * scroll position, which reads as stutter that no amount of tuning fixes.
 *
 * ── Why Lenis drives ScrollTrigger and not the reverse ────────────────────
 * Lenis takes over the wheel and animates `window.scrollY` itself. ScrollTrigger
 * caches scroll position and only recomputes when it hears a scroll event, so
 * without `lenis.on("scroll", ScrollTrigger.update)` every pin and scrub on the
 * site lags one frame behind the content it is pinned to.
 *
 * The rAF loop is GSAP's ticker rather than a second `requestAnimationFrame`,
 * so the smooth scroll and every tween on the page advance on the same frame.
 * Two independent loops is the other way to get stutter.
 *
 * `lagSmoothing(0)` stops GSAP from silently skipping time after a slow frame.
 * With it on, a heavy image decode makes ScrollTrigger jump, and a pinned
 * section visibly snaps.
 *
 * ── Where it switches off ─────────────────────────────────────────────────
 * Touch devices and anyone who asked for reduced motion get native scrolling.
 * Almost every shopper here is on a phone, and hijacking scroll on a phone
 * reads as lag rather than polish — `syncTouch` exists but it is the single
 * most common source of "the site feels broken on my phone".
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    /* Native scrolling for anyone who asked for less motion. ScrollTrigger
       still works — it just reads the browser's own scroll position. */
    if (prefersReducedMotion()) return;

    /* Touch devices keep the scrolling their OS gives them. */
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const ScrollTrigger = registerScrollTrigger();

    const lenis = new Lenis({
      duration: 1.1,
      /* Exponential ease-out. The wheel stops, the page keeps travelling and
         settles — the same settle curve the rest of the site uses. */
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      /* Explicitly off. See the note above. */
      syncTouch: false,
    });

    /* Marks the document so globals.css can stand down native smooth scroll —
       two smooth-scroll implementations fight over the same anchor jump. */
    document.documentElement.classList.add("lenis");

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, []);

  /* A route change leaves ScrollTrigger holding measurements for a page that
     no longer exists. Refreshing after the new route has painted is the
     difference between reveals firing correctly on the second page and firing
     at the wrong scroll position — or not at all. */
  useEffect(() => {
    const ScrollTrigger = registerScrollTrigger();
    const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
