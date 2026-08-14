"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  DURATION,
  EASE_SETTLE,
  prefersReducedMotion,
  registerScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/** Which edge the mask opens from. */
export type RevealFrom = "bottom" | "top" | "left" | "right";

const CLOSED: Record<RevealFrom, string> = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};

const OPEN = "inset(0% 0% 0% 0%)";

/**
 * The IMAGE REVEAL preset. A clip-path mask opens while the picture inside it
 * settles back from an overscale, so the frame stays exactly where it is and
 * the photograph arrives into it.
 *
 * ── Why two elements ─────────────────────────────────────────────────────
 * The mask is on the wrapper and the scale is on the inner element. Animating
 * both on one node means the clip rectangle scales too, and the reveal edge
 * drifts instead of holding still. This is the reason the component owns its
 * own inner `<div>` rather than just decorating whatever it is given.
 *
 * ── Blur ─────────────────────────────────────────────────────────────────
 * `blur` is opt-in and off by default. A filter animation is the one thing
 * here that cannot run on the compositor alone, so it is worth it on a single
 * hero photograph and not worth it on twelve grid tiles.
 *
 * Usage — the child is normally a `next/image` with `fill`:
 *
 *   <ImageReveal className="relative aspect-square">
 *     <Image src={product.image} alt={product.alt} fill sizes="50vw" />
 *   </ImageReveal>
 */
export function ImageReveal({
  children,
  from = "bottom",
  scale = 1.12,
  blur = false,
  delay = 0,
  start = "top 88%",
  className,
}: {
  children: ReactNode;
  from?: RevealFrom;
  /** Starting overscale of the picture inside the mask. 1 disables it. */
  scale?: number;
  /** Blur-to-sharp. Costs a paint each frame — use it sparingly. */
  blur?: boolean;
  delay?: number;
  start?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    const inner = innerRef.current;
    if (!node || !inner) return;

    if (prefersReducedMotion()) {
      node.removeAttribute("data-motion-clip");
      return;
    }

    const ScrollTrigger = registerScrollTrigger();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { duration: DURATION.reveal, ease: EASE_SETTLE },
        scrollTrigger: { trigger: node, start, once: true },
        delay,
      });

      tl.fromTo(node, { clipPath: CLOSED[from] }, { clipPath: OPEN }, 0);

      if (scale !== 1) {
        tl.fromTo(inner, { scale }, { scale: 1, duration: DURATION.long }, 0);
      }

      if (blur) {
        tl.fromTo(inner, { filter: "blur(12px)" }, { filter: "blur(0px)" }, 0);
      }
    }, node);

    return () => ctx.revert();
  }, [from, scale, blur, delay, start]);

  return (
    <div ref={ref} data-motion-clip className={cx("overflow-hidden", className)}>
      {/* The scaling layer. `h-full` so a `fill` image inside still has a
          sized ancestor to fill. */}
      <div ref={innerRef} className="relative h-full w-full will-change-transform">
        {children}
      </div>
    </div>
  );
}
