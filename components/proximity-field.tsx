"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

import { canAnimateRich } from "@/lib/motion";

/**
 * Makes every split-text glyph inside it answer the cursor: each letter lifts
 * and swells by how close the pointer is, with a squared falloff so moving
 * across a line sends a wave through it rather than switching it on.
 *
 * This is the hero's letter effect made reusable — same physics, same
 * cautions, none of the hero's group tuning. Wrap any block that contains
 * SplitText and it works on whatever glyphs it finds.
 *
 * The same three costs are controlled the same way:
 *   · one quickTo per property per glyph, created once — never a tween per
 *     pointermove
 *   · glyph rectangles are cached, measured only after the reveal transition
 *     has landed — during the reveal every glyph sits a full line-height below
 *     its final position, so centres cached at mount are wrong by more than a
 *     letter and the falloff computes zero everywhere
 *   · the cache rebuilds on resize and scroll, the only things that move them
 *
 * Pointer-only via canAnimateRich(): a phone ships the markup and none of the
 * listeners.
 */
export function ProximityField({
  children,
  /** Pixels within which the pointer influences a letter. */
  radius = 300,
  /** Maximum lift in px at zero distance. Negative is up. */
  lift = -18,
  /** Maximum extra scale at zero distance. */
  swell = 0.08,
  /** Seconds until the glyphs are taken over from their reveal transition. */
  takeoverAfter = 1.9,
  className,
}: {
  children: ReactNode;
  radius?: number;
  lift?: number;
  swell?: number;
  takeoverAfter?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !canAnimateRich()) return;

    const glyphs = gsap.utils.toArray<HTMLElement>("[data-glyph]", node);
    if (glyphs.length === 0) return;

    const ctx = gsap.context(() => {
      const controls = glyphs.map((glyph) => ({
        y: gsap.quickTo(glyph, "y", { duration: 0.8, ease: "power3.out" }),
        scale: gsap.quickTo(glyph, "scale", { duration: 0.8, ease: "power3.out" }),
      }));

      let centres: { x: number; y: number }[] = [];
      const measure = () => {
        centres = glyphs.map((glyph) => {
          const r = glyph.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
      };

      /* The reveal is a CSS transition on transform; GSAP writing transform
         while it is armed would double-ease. Hand the letters over once the
         reveal has landed, and only then trust their positions. */
      const takeover = gsap.delayedCall(takeoverAfter, () => {
        gsap.set(glyphs, { transition: "none" });
        measure();
      });

      const onMove = (event: PointerEvent) => {
        controls.forEach((control, i) => {
          const centre = centres[i];
          if (!centre) return;

          const distance = Math.hypot(event.clientX - centre.x, event.clientY - centre.y);
          const near = gsap.utils.clamp(0, 1, 1 - distance / radius) ** 2;

          control.y(near * lift);
          control.scale(1 + near * swell);
        });
      };

      const onLeave = () => {
        controls.forEach((control) => {
          control.y(0);
          control.scale(1);
        });
      };

      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerleave", onLeave);
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, { passive: true });

      return () => {
        takeover.kill();
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure);
      };
    }, node);

    return () => ctx.revert();
  }, [radius, lift, swell, takeoverAfter]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
