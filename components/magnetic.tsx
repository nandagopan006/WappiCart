"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  hasFinePointer,
  prefersReducedMotion,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/**
 * The MAGNETIC preset. The element leans a few pixels toward the cursor while
 * the pointer is over it, and settles back when it leaves.
 *
 * ── Why quickTo and not a tween per event ────────────────────────────────
 * `pointermove` fires far more often than the screen refreshes. Creating a
 * tween per event means dozens of overlapping tweens fighting for the same
 * property, which is both janky and expensive. `gsap.quickTo` builds the tween
 * once and then only writes a new target value — it is the difference between
 * this being free and this being the reason the page drops frames.
 *
 * No React state is involved. A `useState` here would re-render the subtree on
 * every mouse move.
 *
 * ── Where it belongs ─────────────────────────────────────────────────────
 * On the one or two things a section is asking you to press. A page where
 * everything leans toward the cursor is a page where nothing stands out, and
 * on a link the effect competes with the browser's own hit target.
 *
 * Desktop only, and off under reduced motion — a touch device gets a plain
 * wrapper with no listeners attached at all.
 */
export function Magnetic({
  children,
  strength = 12,
  className,
}: {
  children: ReactNode;
  /** Maximum lean in px at the edge of the element. Keep it under ~16. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion() || !hasFinePointer()) return;

    const ctx = gsap.context(() => {
      const moveX = gsap.quickTo(node, "x", { duration: 0.4, ease: "power3.out" });
      const moveY = gsap.quickTo(node, "y", { duration: 0.4, ease: "power3.out" });

      const onMove = (event: PointerEvent) => {
        const box = node.getBoundingClientRect();
        /* Offset from the element's centre, normalised to -1..1, so the lean
           is proportional to how far off-centre the cursor is rather than to
           the element's size. */
        const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
        const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);

        moveX(dx * strength);
        moveY(dy * strength);
      };

      const onLeave = () => {
        moveX(0);
        moveY(0);
      };

      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerleave", onLeave);

      return () => {
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerleave", onLeave);
      };
    }, node);

    return () => ctx.revert();
  }, [strength]);

  return (
    <div ref={ref} className={cx("inline-block will-change-transform", className)}>
      {children}
    </div>
  );
}
