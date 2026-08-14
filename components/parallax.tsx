"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  EASE_SCRUB,
  isCompactViewport,
  prefersReducedMotion,
  registerScrollTrigger,
  travelScale,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/**
 * The PARALLAX preset. The element drifts against the scroll, scrubbed, so a
 * page of flat rectangles gains depth.
 *
 * ── Keep it small ────────────────────────────────────────────────────────
 * `distance` is the total travel across the whole time the element is on
 * screen, and the useful range is roughly 20–80px. Past that it stops reading
 * as depth and starts reading as a element that has come loose. The default
 * is deliberately timid.
 *
 * ── Where it goes ────────────────────────────────────────────────────────
 * On the inner layer, never the frame. A parallax on a card moves the card out
 * of the grid; a parallax on the photograph *inside* a card with
 * `overflow-hidden` moves the picture within its frame, which is the effect
 * that actually looks like depth. Give the element more height than its frame
 * so the drift never exposes an edge.
 *
 * `scrub: 0.5` rather than `true` — half a second of catch-up smooths the
 * coarse steps a mouse wheel produces without the element feeling detached
 * from the finger.
 */
export function Parallax({
  children,
  distance = 40,
  direction = "up",
  scrub = 0.5,
  disableOnMobile = false,
  className,
}: {
  children: ReactNode;
  /** Total travel in px. Scaled down on small screens. */
  distance?: number;
  /** "up" moves against the scroll — the usual choice for a background. */
  direction?: "up" | "down";
  /** Seconds of catch-up. `true` locks it to the scrollbar exactly. */
  scrub?: number | boolean;
  /** Switch the effect off entirely below 768px rather than just scaling it. */
  disableOnMobile?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;
    if (disableOnMobile && isCompactViewport()) return;

    const ScrollTrigger = registerScrollTrigger();

    const ctx = gsap.context(() => {
      const travel = distance * travelScale() * (direction === "up" ? -1 : 1);

      gsap.fromTo(
        node,
        { y: -travel / 2 },
        {
          y: travel / 2,
          ease: EASE_SCRUB,
          scrollTrigger: {
            trigger: node,
            /* Bottom-of-viewport to top-of-viewport: the element is animated
               across exactly the span it is visible for, so it is at its
               resting position when it is centred. */
            start: "top bottom",
            end: "bottom top",
            scrub,
          },
        },
      );
    }, node);

    return () => ctx.revert();
  }, [distance, direction, scrub, disableOnMobile]);

  return (
    <div ref={ref} className={cx("will-change-transform", className)}>
      {children}
    </div>
  );
}
