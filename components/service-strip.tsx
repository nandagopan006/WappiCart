"use client";

import { Fragment, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import gsap from "gsap";
import { Camera, MessageCircle, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { EASE_SETTLE, prefersReducedMotion } from "@/lib/motion";

/**
 * A single line of claims carried past on a slow ribbon. No boxes, no cards,
 * no surfaces — an icon, a few words, a hairline, repeated.
 *
 * ── The copy is short on purpose ─────────────────────────────────────────
 * These are the headline versions. The full terms — delivery areas, the
 * return conditions, the hours we answer in — live in the footer, in full, a
 * screen below. A ribbon is the wrong place to read a returns policy, and
 * cutting the detail here is what lets the line breathe. Nothing is lost from
 * the page; it is just said in the right place.
 *
 * Every claim is true and traceable: two days and seven days come from
 * lib/shop.ts, "photographed by us" from the about page.
 *
 * ── The seam ─────────────────────────────────────────────────────────────
 * The set is rendered twice and the track is moved exactly -50%. Because the
 * second half is an identical copy, the frame at -50% is pixel-identical to
 * the frame at 0, so the loop restarts on a frame nobody can distinguish from
 * the one before it. There is nothing to measure and nothing to drift.
 *
 * Each item is followed by its own rule — including the last one — so both
 * halves are exactly the same width. Drop the trailing rule and the two halves
 * differ by one separator, and the seam jumps once every pass.
 *
 * ── Stopping ─────────────────────────────────────────────────────────────
 * Moving text that cannot be stopped is a WCAG 2.2.2 failure. It stops on
 * pointer, on keyboard focus, and never starts at all under reduced motion —
 * which gets the same line, wrapped and still.
 *
 * The stop is a timeScale tween rather than a pause: motion decelerating over
 * 0.7s reads as something heavy coming to rest, where a hard stop reads as a
 * bug.
 */

type Claim = {
  Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  /** One gesture each, matched to the object it belongs to. */
  motion: string;
};

const CLAIMS: Claim[] = [
  { Icon: Truck, label: "Delivered in 2 days", motion: "group-hover:translate-x-1" },
  { Icon: RotateCcw, label: "7-day returns", motion: "group-hover:-rotate-45" },
  { Icon: MessageCircle, label: "We reply in an hour", motion: "group-hover:scale-110" },
  { Icon: ShieldCheck, label: "Every pair checked", motion: "group-hover:rotate-6" },
  { Icon: Camera, label: "Photographed by us", motion: "group-hover:-translate-y-0.5" },
];

/** Seconds for one full pass. Slow enough to read a claim as it goes by. */
const LOOP_SECONDS = 42;

function Claims() {
  return (
    <>
      {CLAIMS.map(({ Icon, label, motion }) => (
        <Fragment key={label}>
          <span className="ribbon-item group flex shrink-0 items-center gap-3.5 px-9 md:gap-4 md:px-14">
            <Icon
              className={`size-4 shrink-0 transition-transform duration-500 ease-(--ease-settle) ${motion}`}
              strokeWidth={1.25}
              aria-hidden
            />
            <span className="font-mono text-utility tracking-[0.16em] whitespace-nowrap uppercase">
              {label}
            </span>
          </span>

          {/* A hairline, not a glyph. The design system allows one decorative
              mark on the whole site and it is spent on the wordmark. */}
          <span aria-hidden="true" className="bg-muted/30 h-3.5 w-px shrink-0" />
        </Fragment>
      ))}
    </>
  );
}

export function ServiceStrip() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setReduced(true);
      return;
    }

    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const ctx = gsap.context(() => {
      const loop = gsap.to(track, {
        xPercent: -50,
        duration: LOOP_SECONDS,
        ease: "none",
        repeat: -1,
      });

      const slow = () => gsap.to(loop, { timeScale: 0, duration: 0.7, ease: EASE_SETTLE });
      const resume = () => gsap.to(loop, { timeScale: 1, duration: 0.7, ease: EASE_SETTLE });

      viewport.addEventListener("pointerenter", slow);
      viewport.addEventListener("pointerleave", resume);
      /* focusin/focusout, not focus/blur — those do not bubble. */
      viewport.addEventListener("focusin", slow);
      viewport.addEventListener("focusout", resume);

      /* A ribbon animating in a section nobody is looking at is battery spent
         on nothing. */
      const observer = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? loop.play() : loop.pause()),
        { rootMargin: "120px 0px" },
      );
      observer.observe(viewport);

      return () => {
        viewport.removeEventListener("pointerenter", slow);
        viewport.removeEventListener("pointerleave", resume);
        viewport.removeEventListener("focusin", slow);
        viewport.removeEventListener("focusout", resume);
        observer.disconnect();
      };
    }, viewport);

    return () => ctx.revert();
  }, []);

  if (reduced) {
    return (
      <section className="service-ribbon border-muted/20 mt-section relative border-y">
        <h2 className="sr-only">How this shop works</h2>
        <div className="text-muted relative flex flex-wrap items-center justify-center py-8">
          <Claims />
        </div>
      </section>
    );
  }

  return (
    <section className="service-ribbon border-muted/20 mt-section relative border-y py-8 md:py-10">
      <h2 className="sr-only">How this shop works</h2>

      {/* The mask is what makes it read as a line passing through rather than
          one being clipped: claims dissolve at both ends. It sits on the
          viewport, not the track, so it stays put while the content moves. */}
      <div ref={viewportRef} className="marquee-mask text-muted overflow-hidden">
        <div ref={trackRef} className="flex w-max items-center">
          <div className="flex shrink-0 items-center">
            <Claims />
          </div>
          {/* The identical second half, hidden from assistive tech so each
              claim is announced once. */}
          <div aria-hidden="true" className="flex shrink-0 items-center">
            <Claims />
          </div>
        </div>
      </div>
    </section>
  );
}
