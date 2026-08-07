"use client";

import { useEffect, useRef, useState } from "react";

import { cx } from "@/lib/cx";

/**
 * The signature of the entire site. Every shoe rests on a wave.
 *
 * One continuous, gently bending line. Not a zigzag, not a sine wave with tall
 * peaks — a drawn line that happens to curve. The path below deviates about
 * 5.5% of its own width, inside the 8% ceiling.
 *
 * Four jobs, one element:
 *   <Wave />                  divider between sections and category rows
 *   <Wave className="h-2" />  product baseline — same path, shorter box
 *   <Wave tone="light" />     inside the dark hero panel
 *   <Wave vertical />         the /about spine
 *
 * Two implementation notes that do a lot of work here:
 *
 * `preserveAspectRatio="none"` means the height of the box *is* the amplitude.
 * A wave under a product card is the same path in a 8px box; the flattening
 * needs no second path and no transform. `vector-effect="non-scaling-stroke"`
 * keeps the stroke at 1px however far the box is squashed.
 *
 * `pathLength={1}` normalises the path to length 1, so the draw-on-mount is
 * four lines of CSS with no measuring in JavaScript. That is what lets this
 * stay cheap enough to use on every row.
 */

/* Deviation 28→94 over a width of 1200 — 5.5%, a line that bends rather than
   a wave that oscillates. */
const HORIZONTAL = "M0 82C240 82 340 28 600 36C860 44 960 94 1200 62";

/* The same curve turned on its side, for the /about spine. */
const VERTICAL = "M82 0C82 240 28 340 36 600C44 860 94 960 62 1200";

export function Wave({
  /** Stroke colour. `light` is for use inside the dark hero panel. */
  tone = "muted",
  vertical = false,
  /**
   * The one looping animation allowed on this site, so it is opt-in and used
   * once — on the hero. See the note on the keyframes in globals.css.
   */
  ambient = false,
  /** Milliseconds to hold before the line draws itself. */
  delayMs = 0,
  className,
}: {
  tone?: "muted" | "light";
  vertical?: boolean;
  ambient?: boolean;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(!ambient);

  useEffect(() => {
    if (!ambient) return;
    const node = ref.current;
    if (!node) return;

    /* The ambient loop is paused whenever the wave is off screen. An animation
       nobody can see is a phone battery being spent for nothing. */
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, [ambient]);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      viewBox={vertical ? "0 0 120 1200" : "0 0 1200 120"}
      preserveAspectRatio="none"
      data-visible={visible}
      className={cx(
        ambient && "wave-ambient",
        tone === "light" ? "text-blush/45" : "text-muted/30",
        vertical ? "h-full w-6" : "h-6 w-full",
        className,
      )}
    >
      <path
        d={vertical ? VERTICAL : HORIZONTAL}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className="wave-path"
        style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
      />
    </svg>
  );
}
