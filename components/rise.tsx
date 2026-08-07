"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DURATION, EASE_SETTLE, prefersReducedMotion } from "@/lib/motion";

/**
 * The scroll entrance every section on the site shares.
 *
 * Content lifts 28px, resolves from a slight scale, and settles — one gesture
 * per row, with each item 90ms behind the one before it. The scale is small
 * enough that it reads as depth rather than as a zoom; anything more and a
 * grid of twelve products becomes twelve separate events competing for
 * attention.
 *
 * ── Why this is GSAP now ─────────────────────────────────────────────────
 * It used to be an IntersectionObserver and two CSS properties, which was the
 * right call when nothing else on the site needed a timeline. GSAP is now
 * loaded on every route anyway (the header uses it), so this costs no extra
 * bytes and buys three things the CSS version could not have: the same easing
 * as the hero, `scrub`-free replay control, and reveals that stay in step with
 * Lenis because ScrollTrigger is driven from Lenis' own ticker.
 *
 * `once: true` is deliberate. An element that re-animates every time it
 * re-enters the viewport turns scrolling back up into a light show.
 *
 * The hidden start state lives in globals.css behind `.js` with a failsafe, so
 * a bundle that never arrives can never leave the catalogue blank.
 */
export function Rise({
  children,
  /** Position in its row. Multiplies the 90ms stagger. */
  index = 0,
  /** Larger elements travel further. */
  distance = 28,
  className,
}: {
  children: ReactNode;
  index?: number;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      gsap.set(node, { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* Disarm the CSS failsafe now that this effect has proven JS is alive. A
       CSS animation outranks inline styles for the properties it animates, so
       an armed failsafe would override GSAP's transforms when it fired. */
    gsap.set(node, { animation: "none" });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: 0, y: distance, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DURATION.reveal,
          ease: EASE_SETTLE,
          delay: index * 0.09,
          scrollTrigger: {
            trigger: node,
            /* Fires a little before the element is fully on screen, so the
               reveal finishes as it settles into view rather than starting
               after it has already arrived. */
            start: "top 88%",
            once: true,
          },
          /* Hand the element back to CSS once it has arrived — a leftover
             transform on a card would otherwise fight the hover lift. */
          onComplete: () => gsap.set(node, { clearProps: "transform" }),
        },
      );
    }, node);

    return () => ctx.revert();
  }, [index, distance]);

  return (
    <div ref={ref} data-anim className={className}>
      {children}
    </div>
  );
}
