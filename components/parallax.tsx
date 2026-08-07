"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { canAnimateRich } from "@/lib/motion";

/**
 * An image that drifts inside its own frame as the page scrolls.
 *
 * The child is scaled up slightly and then translated by less than the
 * overflow that scaling created, so the frame is never uncovered at either end
 * of the travel. That is the whole trick: parallax inside a fixed frame is a
 * cropping problem before it is an animation problem, and the usual mistake is
 * a gap appearing at the top of the image on a long page.
 *
 * `ease: "none"` because the position is scrubbed against scroll — an eased
 * scrub means the image moves at a different rate than the finger doing the
 * scrolling, which reads as lag rather than depth.
 *
 * Desktop only. On a phone this is a repaint on every scroll frame in exchange
 * for a few pixels of movement nobody asked for.
 */
export function Parallax({
  children,
  /** Pixels of travel across the whole scroll of this element. */
  distance = 40,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !canAnimateRich()) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const inner = node.firstElementChild;
      if (!inner) return;

      /* Cover the travel plus a margin, so no edge is ever exposed. */
      const overscan = 1 + (distance * 2) / node.offsetHeight;

      gsap.set(inner, { scale: overscan, willChange: "transform" });
      gsap.fromTo(
        inner,
        { y: -distance },
        {
          y: distance,
          ease: "none",
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
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
