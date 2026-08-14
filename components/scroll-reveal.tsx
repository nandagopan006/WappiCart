"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  DURATION,
  EASE_SETTLE,
  STAGGER,
  prefersReducedMotion,
  registerScrollTrigger,
  travelScale,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/**
 * The REVEAL preset: opacity 0 → 1 with a short lift, fired once when the
 * element enters the viewport.
 *
 * This is the site's default entrance and the only one that should ever be
 * used more than once on a page. Everything with more personality — image
 * masks, split type, parallax — is a deliberate choice made section by
 * section, not a default.
 *
 * ── stagger ──────────────────────────────────────────────────────────────
 * With `stagger`, the element's *direct children* animate in sequence instead
 * of the element animating as one block. That is what a grid or a list wants;
 * a headline and its paragraph want the block.
 *
 * ── Failing open ─────────────────────────────────────────────────────────
 * The start state is set in CSS behind `html.js` (see globals.css) rather than
 * by GSAP after hydration. If GSAP were to hide the content, the server HTML
 * would paint visible, the bundle would arrive, and the visitor would watch it
 * blink out and back in — worst on exactly the slow connections that can least
 * afford it. The CSS also carries a failsafe animation, so a visitor whose
 * bundle never arrives still gets the content a moment later.
 */
export function ScrollReveal({
  children,
  as: Tag = "div",
  distance = 24,
  delay = 0,
  stagger = false,
  start = "top 85%",
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Travel in px. Scaled down on small screens. */
  distance?: number;
  delay?: number;
  /** Animate direct children in sequence rather than the block as one. */
  stagger?: boolean;
  /** ScrollTrigger start string. Default fires a little before centre. */
  start?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    /* Reduced motion: clear the CSS start state and stop. The visitor gets the
       finished layout immediately, which is the whole promise. */
    if (prefersReducedMotion()) {
      node.removeAttribute("data-motion");
      node.removeAttribute("data-motion-stagger");
      return;
    }

    const ScrollTrigger = registerScrollTrigger();

    const ctx = gsap.context(() => {
      const targets = stagger ? Array.from(node.children) : node;

      gsap.fromTo(
        targets,
        { opacity: 0, y: distance * travelScale() },
        {
          opacity: 1,
          y: 0,
          duration: DURATION.settle,
          ease: EASE_SETTLE,
          delay,
          stagger: stagger ? STAGGER.card : 0,
          scrollTrigger: { trigger: node, start, once: true },
        },
      );
    }, node);

    return () => ctx.revert();
  }, [distance, delay, stagger, start]);

  /* Two attributes rather than one, because the CSS start state has to sit on
     whatever GSAP is about to animate. In stagger mode that is the children,
     and hiding the wrapper instead would leave it at opacity 0 forever. */
  const motionAttr = stagger ? { "data-motion-stagger": "" } : { "data-motion": "" };

  return (
    <Tag ref={ref} {...motionAttr} className={cx(className)}>
      {children}
    </Tag>
  );
}
