"use client";

import { Fragment, useMemo, useRef, type ElementType } from "react";
import gsap from "gsap";

import { cx } from "@/lib/cx";
import {
  hasFinePointer,
  prefersReducedMotion,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

/**
 * A headline whose letters rise and gain weight toward the cursor.
 *
 * Each glyph lifts in proportion to how close the pointer is to it, so the
 * line swells under the hand and settles behind it. The falloff is squared
 * rather than linear — a linear ramp makes every letter within the radius
 * move a little, which reads as the whole word wobbling; squaring it keeps
 * the effect concentrated where the cursor actually is.
 *
 * Everything below exists to stop the type moving in ways nobody asked for.
 *
 * ── 1. Every glyph sits in a slot that never resizes ─────────────────────
 * A heavier glyph is a WIDER glyph, so animating weight in normal flow pushes
 * every letter after it sideways — and because the influence follows the
 * cursor, the whole line jitters. So each glyph renders inside a slot whose
 * width is measured once at rest and then pinned. The glyph inside thickens
 * and lifts freely; the box it grows out of never changes size, so no
 * neighbour can be moved.
 *
 * Pinned to the RESTING width, not the bold one — the line then sits at
 * exactly the tracking it was designed with and only borrows space while a
 * letter is actually under the hand.
 *
 * ── 2. The glyph is anchored left, never centred ─────────────────────────
 * Centring a glyph inside a fixed slot sounds tidier and is the bug: as the
 * letter thickens by Δ, centring drags its left edge Δ/2 to the left, every
 * frame. That horizontal creep rides on top of the vertical lift and reads as
 * a wobble. Anchored left, the glyph's origin is fixed and thickening is the
 * only thing that happens.
 *
 * ── 3. Weight is quantised, and only written when it changes ─────────────
 * Weight is the one property here the compositor cannot touch: every distinct
 * value re-shapes the glyph and re-rasters it. Written as a float it changes
 * on all sixty frames a second, for every letter.
 *
 * So it is rounded to a step and compared against the last value written —
 * across a 250 range that is roughly thirty reshapes over the whole travel
 * instead of hundreds, and none at all once a letter has settled. Thirty
 * steps is far below what the eye resolves as stepping on a stroke this
 * thick, so it costs nothing to look at.
 *
 * ── 4. One ticker, not thirty tweens ─────────────────────────────────────
 * An earlier version gave every glyph three `quickTo` tweens. Thirty tweens
 * for ten letters, each with its own easing clock, is both more work and less
 * predictable than one loop that lerps the whole line toward its target and
 * writes each glyph once.
 *
 * The loop is GSAP's ticker rather than a bare `requestAnimationFrame`, so it
 * advances on the same frame as everything else on the page — including the
 * Lenis scroll. It early-returns when the line is at rest, so a page nobody
 * is pointing at costs one comparison a frame.
 *
 * ── Measured after the font loads, never before ──────────────────────────
 * `document.fonts.ready` gates measurement. Measure before Jost arrives and
 * every slot locks to the fallback face's metrics — a permanently mis-spaced
 * headline, which is far worse than the jitter this is fixing.
 *
 * ── Where it runs ────────────────────────────────────────────────────────
 * Real pointers only, never under reduced motion. A touch device gets plain
 * text with no listeners attached at all.
 *
 * ── Accessibility ────────────────────────────────────────────────────────
 * A string cut into ten spans is announced as ten fragments, and some screen
 * readers spell it out letter by letter. The visible glyphs are `aria-hidden`
 * and the string is repeated once in an `sr-only` node.
 */

/** Smoothing per frame. Higher follows the cursor harder; 0.14 trails it. */
const EASING = 0.14;

/** Weight is rounded to this step before being written. */
const WEIGHT_STEP = 8;

/** Below this, a glyph is treated as settled and stops being written. */
const EPSILON = 0.002;

export function ProximityText({
  children,
  as: Tag = "span",
  lift = 16,
  radius = 150,
  swell = 0.06,
  boost = 250,
  className,
}: {
  /** Plain text only — this cuts a string, not a React tree. */
  children: string;
  as?: ElementType;
  /** Maximum rise in px, at the glyph directly under the cursor. */
  lift?: number;
  /** How far the influence reaches, in px. */
  radius?: number;
  /** Extra scale at full influence. Small on purpose — the weight is already
      doing the growing. */
  swell?: number;
  /**
   * Weight added at full influence, on top of whatever the element already
   * renders at. 250 on a `font-light` headline takes it to 550.
   *
   * Requires a variable font — see the note in app/layout.tsx. Set to 0 to
   * lift without bolding.
   */
  boost?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  /**
   * Cut to lines, then to words, then to glyphs.
   *
   * The word tier is not decoration. Every glyph is its own `inline-block`, and
   * the browser will happily break a line between two of them — so a headline
   * narrower than its container could wrap as SNEAK / ERS. Holding each word in
   * a `whitespace-nowrap` box confines breaks to the real spaces between words,
   * which is where a headline is allowed to break.
   *
   * `\n` in the string forces a line. That is how a two-line statement keeps
   * its break at the width the author chose, rather than wherever the box
   * happens to end.
   */
  const lines = useMemo(
    () =>
      children
        .split("\n")
        .map((line) => line.split(" ").filter(Boolean).map((word) => Array.from(word))),
    [children],
  );

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion() || !hasFinePointer()) return;

    let disposed = false;
    let teardown: (() => void) | undefined;

    /* Nothing may be measured until the real face is in. */
    const start = () => {
      if (disposed || !ref.current) return;

      const slots = Array.from(node.querySelectorAll<HTMLElement>("[data-slot]"));
      const chars = Array.from(node.querySelectorAll<HTMLElement>("[data-char]"));
      if (chars.length === 0) return;

      /* The weight the element already renders at, read rather than assumed —
         this component does not know whether it was dropped on a `font-light`
         headline or a `font-medium` one. */
      const base = Number.parseFloat(getComputedStyle(chars[0]).fontWeight) || 400;
      const top = Math.min(900, base + boost);

      /* Current and target state per glyph, plus the last weight actually
         committed to the DOM so an unchanged step can be skipped. */
      const now = chars.map(() => ({ y: 0, scale: 1, weight: base }));
      const to = chars.map(() => ({ y: 0, scale: 1, weight: base }));
      const written = chars.map(() => base);

      let centres: Array<{ x: number; y: number }> = [];

      const measure = () => {
        /* Release the locks and put every glyph back to rest, so what is
           measured is the resting metric and not a mid-hover one. */
        for (let i = 0; i < chars.length; i += 1) {
          slots[i].style.width = "";
          chars[i].style.transform = "";
          chars[i].style.fontWeight = String(base);
        }

        /* Read every width before writing any of them — interleaving reads and
           writes forces a reflow per glyph. */
        const widths = chars.map((char) => char.getBoundingClientRect().width);
        for (let i = 0; i < chars.length; i += 1) {
          slots[i].style.width = `${widths[i]}px`;
        }

        centres = slots.map((slot) => ({
          x: slot.offsetLeft + slot.offsetWidth / 2,
          y: slot.offsetTop + slot.offsetHeight / 2,
        }));
      };

      measure();

      const pointer = { x: 0, y: 0 };
      let engaged = false;
      /* Set whenever a target changes or a glyph is still in flight. While
         false the ticker does nothing at all. */
      let running = false;

      const onMove = (event: PointerEvent) => {
        const box = node.getBoundingClientRect();
        pointer.x = event.clientX - box.left;
        pointer.y = event.clientY - box.top;
        engaged = true;
        running = true;
      };

      const onLeave = () => {
        engaged = false;
        running = true;
      };

      const tick = () => {
        if (!running) return;

        let settled = true;

        for (let i = 0; i < chars.length; i += 1) {
          if (engaged) {
            const dx = pointer.x - centres[i].x;
            const dy = pointer.y - centres[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            /* Squared falloff — see the note above. */
            const influence = Math.max(0, 1 - distance / radius) ** 2;

            to[i].y = -lift * influence;
            to[i].scale = 1 + swell * influence;
            to[i].weight = base + (top - base) * influence;
          } else {
            to[i].y = 0;
            to[i].scale = 1;
            to[i].weight = base;
          }

          const state = now[i];
          state.y += (to[i].y - state.y) * EASING;
          state.scale += (to[i].scale - state.scale) * EASING;
          state.weight += (to[i].weight - state.weight) * EASING;

          const restingY = Math.abs(state.y - to[i].y) < EPSILON;
          const restingScale = Math.abs(state.scale - to[i].scale) < EPSILON;
          if (!restingY || !restingScale) settled = false;

          /* One transform string, so the browser parses a single declaration
             rather than composing several. translate3d keeps it on the
             compositor. */
          chars[i].style.transform = `translate3d(0,${state.y.toFixed(2)}px,0) scale(${state.scale.toFixed(4)})`;

          if (boost > 0) {
            const stepped = Math.round(state.weight / WEIGHT_STEP) * WEIGHT_STEP;
            /* The expensive write. Skipped entirely unless the rounded value
               actually moved — this is what keeps the text from re-shaping on
               every frame. */
            if (stepped !== written[i]) {
              chars[i].style.fontWeight = String(stepped);
              written[i] = stepped;
              settled = false;
            }
          }
        }

        /* Snap to the target and stop, so a line at rest costs nothing. */
        if (settled) {
          for (let i = 0; i < chars.length; i += 1) {
            now[i].y = to[i].y;
            now[i].scale = to[i].scale;
            now[i].weight = to[i].weight;
          }
          running = false;
        }
      };

      /* Window resize rather than a ResizeObserver: this effect writes widths
         to its own children, and an observer watching the element those
         children size would re-enter itself. The display size is a vw clamp,
         so the window is what actually changes it. */
      let resizeId = 0;
      const onResize = () => {
        window.clearTimeout(resizeId);
        resizeId = window.setTimeout(measure, 150);
      };

      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerleave", onLeave);
      window.addEventListener("resize", onResize);
      gsap.ticker.add(tick);

      teardown = () => {
        window.clearTimeout(resizeId);
        gsap.ticker.remove(tick);
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("resize", onResize);

        for (let i = 0; i < chars.length; i += 1) {
          slots[i].style.width = "";
          chars[i].style.transform = "";
          chars[i].style.fontWeight = "";
        }
      };
    };

    /* `fonts.ready` resolves immediately when the face is already cached, so
       this costs a microtask on every navigation after the first. */
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(start);
    } else {
      start();
    }

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [children, lift, radius, swell, boost]);

  return (
    /* `relative` so each slot's offsetLeft/offsetTop are measured against this
       element rather than some ancestor further up the page. */
    <Tag ref={ref} className={cx("relative block", className)}>
      <span className="sr-only">{children}</span>

      <span aria-hidden="true">
        {lines.map((words, li) => (
          <span key={li} className="block">
            {words.map((word, wi) => (
              <Fragment key={wi}>
                {/* The word space, and it has to live HERE — a sibling of the
                    word boxes, not the first child of one. A leading space
                    inside an inline-block is trimmed by the inline formatting
                    context, so putting it in the box renders ORDERINAMESSAGE.
                    Out here it is an ordinary text node in the line's flow: it
                    renders, and it is the one place the line may break. */}
                {wi > 0 ? " " : null}
                <span className="inline-block whitespace-nowrap">
                  {word.map((glyph, gi) => (
                    /* The slot holds the space; the glyph inside does the
                       moving. No text-align — see note 2. */
                    <span key={`${glyph}-${gi}`} data-slot className="inline-block">
                      <span data-char className="inline-block">
                        {glyph}
                      </span>
                    </span>
                  ))}
                </span>
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
