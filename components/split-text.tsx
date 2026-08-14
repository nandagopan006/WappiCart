"use client";

import { useMemo, useRef, type ElementType } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  DURATION,
  EASE_SETTLE,
  STAGGER,
  prefersReducedMotion,
  registerScrollTrigger,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/** How finely the string is cut. */
export type SplitBy = "char" | "word" | "line";

/**
 * The TEXT REVEAL preset. Each piece sits below its own mask and slides up
 * into it, one after another.
 *
 * ── Opt in, never automatic ──────────────────────────────────────────────
 * This is deliberately a component you wrap a headline in rather than
 * something applied to every heading on the site. Split type on a section
 * label is noise; split type on the one line a section is built around is the
 * section's entrance. Use it two or three times a page, not ten.
 *
 * ── Accessibility ────────────────────────────────────────────────────────
 * A string cut into twenty `<span>`s is read aloud as twenty fragments, and
 * some screen readers spell it out letter by letter. So the visible pieces are
 * `aria-hidden` and the original string is repeated once in a `sr-only` node.
 * What is heard is the sentence; what is seen is the animation.
 *
 * ── Why "line" is really "word" ──────────────────────────────────────────
 * True line splitting means measuring where the browser actually wrapped, then
 * re-measuring on every resize and font swap. That is a lot of layout thrash
 * for a catalogue. `line` here cuts on explicit newlines in the string, so the
 * author decides where the lines are — which is what an editorial headline
 * wants anyway.
 */
export function SplitText({
  children,
  as: Tag = "span",
  by = "char",
  stagger,
  delay = 0,
  start = "top 88%",
  className,
}: {
  /** Plain text only — this component cuts a string, not a React tree. */
  children: string;
  as?: ElementType;
  by?: SplitBy;
  /** Seconds between pieces. Defaults to the token for the chosen split. */
  stagger?: number;
  delay?: number;
  start?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  const pieces = useMemo(() => {
    if (by === "line") return children.split("\n");
    if (by === "word") return children.split(" ");
    return Array.from(children);
  }, [children, by]);

  const step = stagger ?? (by === "char" ? STAGGER.char : STAGGER.line);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      node.removeAttribute("data-motion-split");
      return;
    }

    const ScrollTrigger = registerScrollTrigger();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node.querySelectorAll("[data-piece]"),
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: DURATION.long,
          ease: EASE_SETTLE,
          stagger: step,
          delay,
          scrollTrigger: { trigger: node, start, once: true },
        },
      );
    }, node);

    return () => ctx.revert();
  }, [step, delay, start, pieces.length]);

  return (
    <Tag ref={ref} data-motion-split className={cx("block", className)}>
      <span className="sr-only">{children}</span>

      <span aria-hidden="true">
        {pieces.map((piece, i) => (
          <span
            key={`${piece}-${i}`}
            /* The mask. `inline-block` so it can be given a height to clip
               against, and `overflow-hidden` so the piece below it is out of
               sight until it travels up. */
            className={cx("inline-block overflow-hidden", by === "line" && "block")}
          >
            <span data-piece className="inline-block will-change-transform">
              {/* A space collapses to nothing inside an inline-block, so word
                  and char splits would run together without this. */}
              {piece === " " ? " " : piece}
              {by === "word" && i < pieces.length - 1 ? " " : null}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
