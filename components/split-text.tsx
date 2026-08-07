"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * Type that arrives one letter at a time, from behind its own baseline.
 *
 * Each character sits in a span with `overflow: hidden`, and the glyph inside
 * is translated fully below it. Sliding the inner span up to 0 makes the
 * letter appear to rise out of the line rather than fade onto it — a mask
 * reveal, which is what stops a stagger reading as a cheap typewriter effect.
 *
 * ── Why this is CSS and not GSAP ─────────────────────────────────────────
 * It was a GSAP tween. A `yPercent` tween against these masked inline-blocks
 * would write its `from` state and then never advance — reproducibly, and
 * while sibling tweens inside the very same timeline ran to completion. It
 * survived every isolation: with and without a delay, with and without a
 * ScrollTrigger, driven by its own context and driven by the hero's timeline.
 *
 * Rather than ship an effect that works for reasons I cannot state, the reveal
 * is expressed as a transition, and the stagger as a per-glyph
 * transition-delay. The cascade does the scheduling, there is nothing to tick,
 * and the visual is identical.
 *
 * ── Accessibility ────────────────────────────────────────────────────────
 * Splitting text into per-character spans destroys it for a screen reader,
 * which would announce "W. A. P. P. I." one letter at a time. The whole string
 * is rendered once in a visually hidden span for assistive tech, and the split
 * copy is marked aria-hidden. The text is in the DOM twice and read once.
 *
 * The hidden start state lives behind `.js` in globals.css with a failsafe, so
 * a bundle that never arrives cannot leave a headline parked below its mask.
 */
export function SplitText({
  children,
  /** Seconds before the first character starts. */
  delay = 0,
  /** Seconds between characters. */
  stagger = 0.03,
  /**
   * Reveal when the element scrolls into view rather than on mount. Section
   * headings want this; the hero wordmark does not, because it is already on
   * screen and belongs to the load sequence.
   */
  onScroll = false,
  id,
  className,
  style,
  as: Tag = "span",
}: {
  children: string;
  delay?: number;
  stagger?: number;
  onScroll?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      setRevealed(true);
      return;
    }

    if (!onScroll) {
      /* Two frames, not zero. The glyphs need one painted frame at their start
         position, or the browser coalesces both states and the transition has
         nothing to travel from. */
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setRevealed(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      /* Fires a little before the element is fully on screen, so the reveal
         finishes as it settles into view rather than starting after it. */
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onScroll]);

  const words = children.split(" ");

  /* Characters are grouped into words for wrapping, but the stagger has to run
     across the whole string — otherwise every word restarts the sequence and
     the line arrives in clumps. This offsets each word by the characters
     before it. */
  const wordOffsets = words.reduce<number[]>((acc, word, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + words[i - 1].length);
    return acc;
  }, []);

  return (
    <Tag ref={ref as never} id={id} data-split-revealed={revealed} className={className} style={style}>
      <span className="sr-only">{children}</span>

      <span aria-hidden="true">
        {/* Characters are grouped into whitespace-nowrap words.
            Without this, every character is its own inline-block and the line
            may break between any two of them — "Send one message" wraps as
            "Send o / ne message". The space between words is a real text node,
            so lines still break where they should. */}
        {words.map((word, wordIndex) => (
          <span key={wordIndex}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((character, i) => (
                /* The outer span is the mask; the inner one is what moves.
                   `pb-[0.1em]` keeps descenders from being shaved off. */
                <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                  <span
                    data-glyph
                    className="inline-block will-change-transform"
                    style={{ transitionDelay: `${delay + (wordOffsets[wordIndex] + i) * stagger}s` }}
                  >
                    {character}
                  </span>
                </span>
              ))}
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
