"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
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
 *
 * ── skip / onDone ────────────────────────────────────────────────────────
 * `once: true` only holds for as long as the component stays mounted, which is
 * not long enough on /shop: filtering and sorting re-render the whole grid, and
 * a pair that has already been unveiled must not be unveiled again on its way
 * to a new position. So the caller is given the two halves of that memory —
 * `onDone` fires when a card has finished arriving, and `skip` renders it in
 * its finished state without a timeline.
 *
 * Deliberately a prop rather than internal state: the DOM shape has to stay
 * identical either way, because the catalogue's Framer Motion layout animation
 * measures these nodes across the very re-render that flips the flag. Swapping
 * the wrapper out instead would remount the card, and a remounted card reloads
 * its photograph mid-morph.
 */
export function ShowroomReveal({
  children,
  /** Position in its row. Multiplies the stagger. */
  index = 0,
  /** Render the finished state immediately — this pair has already arrived. */
  skip = false,
  /** Fired once the card has finished arriving. */
  onDone,
  className,
}: {
  children: ReactNode;
  index?: number;
  skip?: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const maskRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* Held in a ref so a caller passing an inline arrow — which every caller
     will — cannot re-run the timeline on every render. */
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useLayoutEffect(() => {
    const mask = maskRef.current;
    const card = cardRef.current;
    if (!mask || !card) return;

    /* Reduced motion, and anything already revealed, get the finished state and
       nothing else. Both start states live in CSS, so they have to be cleared
       here rather than simply left un-animated. */
    if (skip || prefersReducedMotion()) {
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
          onDoneRef.current?.();
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
  }, [index, skip]);

  return (
    <div ref={maskRef} data-showroom className={className}>
      <div ref={cardRef} data-showroom-card>
        {children}
      </div>
    </div>
  );
}
