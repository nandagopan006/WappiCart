"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { EASE_SETTLE, prefersReducedMotion } from "@/lib/motion";

/**
 * The reveal used for products, and only for products.
 *
 * A pair arrives the way stock is set out in a showroom: the case lifts, and
 * the shoe is already standing there, angled slightly away and coming square
 * as it settles into focus. Four things happen at once —
 *
 *   · a curtain of clip-path rises from the bottom edge
 *   · the card comes forward from 6° of rotateX, at 900px perspective
 *   · it resolves from 14px of blur
 *   · it settles the last 40px upward
 *
 * ── Why this is not `Rise` ───────────────────────────────────────────────
 * `Rise` stays exactly as it is. It is shared with the service strip and the
 * banner copy, where four plain facts should not arrive with more ceremony
 * than the shoes do. Giving products their own reveal keeps both honest, and
 * means nothing outside the three product grids changes behaviour.
 *
 * ── Why two elements ─────────────────────────────────────────────────────
 * The outer div owns the mask, the inner one owns the transform. On one
 * element the card would translate *inside* its own clip and appear to slide
 * out from under itself; worse, the leftover clip-path would crop the 4px
 * hover lift for the rest of the session. Split, each does one job.
 *
 * ── Performance ──────────────────────────────────────────────────────────
 * `filter: blur()` and `clip-path` are the two genuinely expensive properties
 * here — neither is composited, so both repaint every frame they animate.
 * That is affordable for ~1s on the handful of cards in a viewport, and
 * unaffordable afterwards, so both are removed with `clearProps` the moment
 * the tween lands. What remains is a plain element with no filter, no clip and
 * no will-change, free for the parallax and hover already on it.
 *
 * `once: true` — a grid that re-reveals every time you scroll back up is a
 * light show, not a showroom.
 */
export function ShowroomReveal({
  children,
  /** Position in its row. Multiplies the stagger. */
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const maskRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mask = maskRef.current;
    const card = cardRef.current;
    if (!mask || !card) return;

    /* Reduced motion gets the finished state and nothing else. Both start
       states live in CSS, so they have to be cleared here rather than simply
       left un-animated. */
    if (prefersReducedMotion()) {
      gsap.set([mask, card], { animation: "none" });
      gsap.set(mask, { clipPath: "none" });
      gsap.set(card, { opacity: 1, clearProps: "transform,filter" });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* Stand the CSS failsafe down. It exists for the case where this effect
       never runs — and this effect is running, so from here GSAP owns both
       elements outright.

       This is not tidiness. A CSS animation outranks inline styles for the
       properties it animates, including during `forwards` fill, so a failsafe
       left armed would override every transform GSAP writes the moment it
       fired. */
    gsap.set([mask, card], { animation: "none" });

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: EASE_SETTLE },
        delay: index * 0.11,
        scrollTrigger: {
          trigger: mask,
          /* Starts a little before the card is fully in view, so it finishes
             as it settles rather than after it has already arrived. */
          start: "top 86%",
          once: true,
        },
        onComplete: () => {
          /* `clip-path: none` is set explicitly rather than cleared. Clearing
             the inline value would expose the CSS start state underneath and
             the card would vanish again. An inset(0%) clip is not free either
             — it would crop the wave that bleeds past each card's edge. */
          gsap.set(mask, { clipPath: "none" });
          gsap.set(card, { clearProps: "filter,transform,willChange" });
        },
      });

      timeline
        .fromTo(
          mask,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.15 },
          0,
        )
        .fromTo(
          card,
          {
            opacity: 0,
            y: 40,
            scale: 0.96,
            rotateX: 6,
            transformPerspective: 900,
            transformOrigin: "50% 100%",
            filter: "blur(14px)",
            willChange: "transform, filter",
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            filter: "blur(0px)",
            duration: 1.25,
          },
          0,
        );
    }, mask);

    return () => ctx.revert();
  }, [index]);

  return (
    <div ref={maskRef} data-showroom className={className}>
      <div ref={cardRef} data-showroom-card>
        {children}
      </div>
    </div>
  );
}
