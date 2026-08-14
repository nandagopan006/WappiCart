"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  EASE_SCRUB,
  prefersReducedMotion,
  registerScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/**
 * Horizontal motion, as an accent.
 *
 * Two modes, and the choice matters:
 *
 *   scroll  the track's position is driven by the page scroll. Nothing moves
 *           while the visitor is still. This is the default, and it is the
 *           right one almost always — the movement is a response to the
 *           reader rather than a thing demanding attention beside the text.
 *
 *   auto    a continuous loop. Reserve it for a brand line that genuinely is
 *           a ticker. One per page, at most.
 *
 * ── The duplicate track ──────────────────────────────────────────────────
 * The children are rendered twice and the track travels exactly -50%. At that
 * point the second copy sits precisely where the first started, so the loop
 * repeats with no visible seam and no measuring. The duplicate is
 * `aria-hidden` — the same sentence twice is a bug to a screen reader.
 */
export function Marquee({
  children,
  mode = "scroll",
  /** scroll: px the track travels across its scroll span. auto: seconds per loop. */
  amount = 240,
  reverse = false,
  className,
}: {
  children: ReactNode;
  mode?: "scroll" | "auto";
  amount?: number;
  reverse?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    const track = trackRef.current;
    if (!node || !track) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      if (mode === "auto") {
        gsap.fromTo(
          track,
          { xPercent: reverse ? -50 : 0 },
          {
            xPercent: reverse ? 0 : -50,
            duration: amount,
            ease: "none",
            repeat: -1,
          },
        );
        return;
      }

      const ScrollTrigger = registerScrollTrigger();
      const travel = reverse ? amount : -amount;

      gsap.fromTo(
        track,
        { x: -travel / 2 },
        {
          x: travel / 2,
          ease: EASE_SCRUB,
          scrollTrigger: {
            trigger: node,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        },
      );
    }, node);

    return () => ctx.revert();
  }, [mode, amount, reverse]);

  return (
    <div ref={ref} className={cx("overflow-hidden", className)}>
      <div ref={trackRef} className="flex w-max will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div aria-hidden="true" className="flex shrink-0 items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
