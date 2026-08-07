"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

import { canAnimateRich, DURATION, EASE_SETTLE } from "@/lib/motion";

/**
 * A button that leans toward the cursor.
 *
 * The element follows the pointer by a fraction of the distance from its own
 * centre, capped so it never detaches from where it actually is. The label
 * inside moves slightly further than the button, which is what sells it as a
 * physical object with a surface rather than a div being translated.
 *
 * The tween writes to a quickTo instance rather than creating a new tween per
 * mousemove — mousemove fires far more often than 60Hz on a high-polling
 * mouse, and a fresh tween per event is how a magnetic button ends up costing
 * more frames than everything else on the page combined.
 *
 * Pointer devices only, and never under reduced motion. On a phone this is
 * dead weight, so the wrapper renders its child and nothing else.
 */
export function Magnetic({
  children,
  /** How far the element may travel from rest, in px. */
  strength = 14,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !canAnimateRich()) return;

    const label = node.querySelector<HTMLElement>("[data-magnetic-label]") ?? node.firstElementChild;

    const ctx = gsap.context(() => {
      const moveX = gsap.quickTo(node, "x", { duration: 0.5, ease: EASE_SETTLE });
      const moveY = gsap.quickTo(node, "y", { duration: 0.5, ease: EASE_SETTLE });
      const labelX = label ? gsap.quickTo(label, "x", { duration: 0.6, ease: EASE_SETTLE }) : null;
      const labelY = label ? gsap.quickTo(label, "y", { duration: 0.6, ease: EASE_SETTLE }) : null;

      const onMove = (event: PointerEvent) => {
        const box = node.getBoundingClientRect();
        /* -1..1 from the centre, then clamped so a fast flick past the corner
           cannot throw the element further than `strength`. */
        const relX = gsap.utils.clamp(-1, 1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2));
        const relY = gsap.utils.clamp(-1, 1, (event.clientY - (box.top + box.height / 2)) / (box.height / 2));

        moveX(relX * strength);
        moveY(relY * strength);
        labelX?.(relX * strength * 0.35);
        labelY?.(relY * strength * 0.35);
      };

      const onLeave = () => {
        moveX(0);
        moveY(0);
        labelX?.(0);
        labelY?.(0);
      };

      /* A press dips the surface; releasing lets it spring back. */
      const onDown = () => gsap.to(node, { scale: 0.96, duration: DURATION.quick, ease: EASE_SETTLE });
      const onUp = () => gsap.to(node, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.5)" });

      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerleave", onLeave);
      node.addEventListener("pointerdown", onDown);
      node.addEventListener("pointerup", onUp);
      node.addEventListener("pointercancel", onUp);

      return () => {
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerleave", onLeave);
        node.removeEventListener("pointerdown", onDown);
        node.removeEventListener("pointerup", onUp);
        node.removeEventListener("pointercancel", onUp);
      };
    }, node);

    return () => ctx.revert();
  }, [strength]);

  return (
    <span ref={ref} className={className} style={{ display: "inline-block", willChange: "transform" }}>
      {children}
    </span>
  );
}
