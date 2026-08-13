"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * The About page's spine: a vertical wave in the left gutter that draws itself
 * as the reader moves down the page, with a dot at each plate that lights when
 * that plate is the one on screen.
 *
 * This is the site's signature line doing progress duty — the reader can see
 * where they are in the story the way they can feel it in a book's thickness.
 * It was in the original brief for this page and is the one piece of it that
 * had never been built.
 *
 * ── Mechanics ────────────────────────────────────────────────────────────
 * The path is normalised with pathLength=1, so filling it is a scrub of
 * stroke-dashoffset from 1 → 0 across the article's scroll — no measuring of
 * path length in JavaScript, same trick as the horizontal waves.
 *
 * Dots are placed by measuring each `[data-plate]` section's centre once (and
 * on resize), not per frame. Each lights via a ScrollTrigger toggle while its
 * plate occupies the middle of the viewport.
 *
 * The amplitude is deliberately small: the dots sit at the rail's centre, and
 * a gentle weave keeps the line passing through them. A deeper wave would
 * leave the dots visibly floating beside the line they are supposed to sit on.
 *
 * Desktop (xl) only — below that there is no gutter for it to live in, and
 * `offsetParent === null` skips all the work when it is display:none. Without
 * JavaScript the line simply shows complete: the fromTo is what hides it, so a
 * failed bundle can never leave an invisible spine.
 */
export function Spine() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [dots, setDots] = useState<number[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    if (!root || !path) return;
    /* Hidden below xl — skip everything. */
    if (!root.offsetParent) return;

    const article = root.closest("article");
    if (!article) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      const plates = gsap.utils.toArray<HTMLElement>("[data-plate]", article);

      const measure = () => {
        const top = root.getBoundingClientRect().top;
        setDots(
          plates.map((plate) => {
            const r = plate.getBoundingClientRect();
            return r.top - top + Math.min(r.height / 2, 220);
          }),
        );
      };
      measure();

      if (reduced) {
        /* The spine complete, nothing moving. */
        gsap.set(path, { attr: { "stroke-dashoffset": 0 } });
        return;
      }

      /* Tweened as an SVG attribute, not a CSS property. The CSS route went
         through unit conversion and arrived binary — 1 until mid-page, then 0,
         never a fraction in between. Attributes tween as plain numbers, and a
         progress line that cannot show partial progress is not one. */
      gsap.fromTo(
        path,
        { attr: { "stroke-dashoffset": 1 } },
        {
          attr: { "stroke-dashoffset": 0 },
          ease: "none",
          scrollTrigger: {
            trigger: article,
            start: "top 60%",
            /* Completes only when the article's end has actually arrived —
               a progress line that finishes at half-way is telling a lie. */
            end: "bottom bottom",
            scrub: 0.5,
          },
        },
      );

      plates.forEach((plate, i) => {
        ScrollTrigger.create({
          trigger: plate,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => {
            /* Queried at toggle time — the dots render from state after this
               context runs, so a reference captured now could be stale. */
            root.querySelectorAll(".spine-dot")[i]?.classList.toggle("is-active", self.isActive);
          },
        });
      });

      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-5 z-0 hidden w-8 xl:block"
    >
      <svg
        viewBox="0 0 40 1200"
        preserveAspectRatio="none"
        className="text-muted/40 h-full w-full"
        focusable="false"
      >
        <path
          ref={pathRef}
          d="M20 0C20 200 13 320 15 560C17 800 27 940 20 1200"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={1}
        />
      </svg>

      {dots.map((y, i) => (
        <span key={i} className="spine-dot" style={{ top: y }} />
      ))}
    </div>
  );
}
