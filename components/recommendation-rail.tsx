"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { cx } from "@/lib/cx";
import { prefersReducedMotion } from "@/lib/motion";
import type { Product } from "@/lib/catalogue";

/**
 * A short edit of pairs to keep looking at, browsed sideways.
 *
 * ── It renders the real product card ─────────────────────────────────────
 * Not a smaller copy of one. Every tile keeps its heart, its hover image
 * swap, its price and its link because it *is* the same component — only the
 * slot around it is narrower. A second card implementation would be a second
 * design system to keep in step.
 *
 * ── How many are visible is a number, not a width ────────────────────────
 * The rail used to size its cards with `w-[46vw] sm:w-[230px]`. A fixed 230px
 * is a different composition on every screen: five cramped cards on a laptop,
 * a lost strip on a wide monitor. So the breakpoints declare **how many cards
 * should be visible** and the card width is derived from the container:
 *
 *     width = (100% − (visible − 1) × gap) ÷ visible
 *
 * Every count is fractional on purpose. At `4.5` a desktop shows four whole
 * pairs and half of the fifth — the half is the affordance, and it is doing
 * the job an arrow alone cannot: it says the row continues before anyone has
 * touched anything.
 *
 * On a phone `1.15` gives one card at roughly 80% of the screen with a sliver
 * of the next. That is the swipe cue, and it is why the mobile rail is a
 * deliberate composition rather than the desktop one scaled down.
 *
 * ── The scrolling ────────────────────────────────────────────────────────
 * A plain `overflow-x-auto` strip with scroll snapping. Native everywhere: a
 * phone swipes it with real momentum, a trackpad scrolls it sideways, a
 * keyboard tabs through it and the browser scrolls each card into view.
 * Nothing is intercepted, so vertical scrolling over the row still moves the
 * page — the rail is never a trap.
 *
 * It does not autoplay. A row that moves on its own takes the decision to
 * look away from the reader.
 *
 * ── The arrows move by cards, not by guesses ─────────────────────────────
 * `scrollBy` used to travel 80% of the viewport, which lands mid-card at most
 * widths and fights the snap points. The step is now measured from the first
 * card's real width plus the real gap, then multiplied by however many whole
 * cards fit — so a press always lands on a card edge.
 *
 * ── Why the progress rule is not React state ─────────────────────────────
 * It is written straight to the DOM inside a rAF from the scroll handler.
 * Putting a 0–100 number through `useState` would re-render eight product
 * cards on every frame of a swipe. Only `atStart`/`atEnd` are state, and they
 * are booleans that change twice per traversal.
 */

/**
 * How many cards are visible per breakpoint, as CSS custom properties.
 *
 * The counts step up more slowly than the breakpoints do, because a count is
 * applied at the *start* of its range where the container is narrowest. Four
 * and a half cards from `lg` sounds right and is 198px at 1024px — narrower
 * than the fixed size this replaced.
 *
 * ── Why the phone shows 2.2 and not 2.1 ──────────────────────────────────
 * The card was one per screen, which made the section tall and showed almost
 * nothing to compare. It is now two plus a sliver.
 *
 * The exact count is a trade, and it is worth writing down. The container is
 * the viewport minus 32px of page padding — about 91.5vw. Two cards at 42vw
 * plus two 12px gaps already spend 90.4vw of that, leaving 4px of the third
 * card: technically a partial, visually nothing. Dropping to 40vw buys a
 * 20px sliver, which is the difference between a shopper seeing an edge and
 * seeing a shoe. The sliver is the whole reason the rail reads as swipeable
 * before anyone touches it, so it wins.
 *
 *     320 → 124px (39vw)   375 → 149px (40vw)   414 → 165px (40vw)
 *     sm 640 → 246px   md 768 → 239px   lg 1024 → 252px   1400 → 288px
 */
const VISIBLE =
  "[--rail-visible:2.2] sm:[--rail-visible:2.4] md:[--rail-visible:2.8] lg:[--rail-visible:3.6] xl:[--rail-visible:4.4]";

/** Card width, derived from the container and the visible count. */
const CARD_WIDTH =
  "w-[calc((100%-(var(--rail-visible)-1)*var(--rail-gap))/var(--rail-visible))]";

export function RecommendationRail({
  products,
  heading,
  note,
  showAllHref = "/shop",
  showAllLabel = "Explore the full collection",
}: {
  products: Product[];
  heading: string;
  /** One quiet line tying the rail to what is above it. */
  note?: string;
  showAllHref?: string;
  showAllLabel?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [overflows, setOverflows] = useState(false);

  /**
   * Read the rail's position and write everything that depends on it.
   *
   * Booleans go to state — they change twice in a traversal and React bails
   * out when the value is unchanged. The progress rule is written directly,
   * because it changes every frame.
   */
  const sync = useCallback(() => {
    const node = railRef.current;
    if (!node) return;

    const max = node.scrollWidth - node.clientWidth;
    /* A pixel of slack: sub-pixel widths mean scrollLeft rarely lands exactly
       on the maximum, and a "next" arrow still live at the end is worse than
       no arrow at all. */
    const scrollable = max > 1;

    setOverflows(scrollable);
    setAtStart(node.scrollLeft <= 1);
    setAtEnd(!scrollable || node.scrollLeft >= max - 1);

    const bar = progressRef.current;
    if (bar) {
      const ratio = scrollable ? node.scrollLeft / max : 0;
      /* The thumb is a fixed fraction of the track that travels across it,
         rather than a fill that grows — a growing fill reads as loading.

         A thumb one third of the track can only travel the other two thirds,
         which is 200% of its own width. Using 300% would carry its right
         edge past the end and the thumb would vanish at full scroll. */
      bar.style.transform = `translateX(${ratio * 200}%)`;
    }
  }, []);

  useEffect(() => {
    const node = railRef.current;
    if (!node) return;

    sync();

    const onScroll = () => {
      /* One read per frame however fast the finger moves. */
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(sync);
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);

    return () => {
      cancelAnimationFrame(frameRef.current);
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
    };
  }, [sync, products.length]);

  /** One card plus one gap, measured rather than assumed. */
  const cardStep = useCallback(() => {
    const node = railRef.current;
    if (!node) return 0;

    const first = node.firstElementChild as HTMLElement | null;
    if (!first) return node.clientWidth;

    const gap = Number.parseFloat(getComputedStyle(node).columnGap) || 0;
    return first.offsetWidth + gap;
  }, []);

  const nudge = useCallback(
    (direction: 1 | -1) => {
      const node = railRef.current;
      if (!node) return;

      const step = cardStep();
      if (step <= 0) return;

      /* However many whole cards fit, at least one — so a press always lands
         on a card edge and never fights the snap points. */
      const cards = Math.max(1, Math.floor(node.clientWidth / step));

      node.scrollBy({
        left: direction * cards * step,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [cardStep],
  );

  /* Nothing to recommend. Render nothing rather than an empty section. */
  if (products.length === 0) return null;

  return (
    <section className="mt-section" aria-labelledby="rail-heading">
      <ScrollReveal as="header">
        <div className="section-index">
          <h2 id="rail-heading" className="text-caption text-ink uppercase">
            {heading}
          </h2>

          {/* Controls sit on the heading's own baseline, so the header costs
              one row rather than two. Hidden entirely when there is nothing
              to scroll — a pair of permanently dead arrows is furniture. */}
          {overflows ? (
            <div className="ml-auto hidden items-center gap-1.5 md:flex">
              <RailArrow direction="previous" disabled={atStart} onClick={() => nudge(-1)} />
              <RailArrow direction="next" disabled={atEnd} onClick={() => nudge(1)} />
            </div>
          ) : null}
        </div>

        {note ? <p className="text-body text-grey mt-3 max-w-[42ch] md:mt-4">{note}</p> : null}
      </ScrollReveal>

      {/* ── The rail ──────────────────────────────────────────────────────
          It sits **inside the page container**, never bleeding past it. The
          previous version used `-mx-4 … px-4` to run to the screen edge. The
          arithmetic happened to cancel out, but a negative margin is the one
          construct here able to exceed its parent's content box, and it was
          silently coupled to the page keeping exactly `px-4` — change that
          padding and the page overflows with nothing to point at.

          Staying inside the container makes overflow impossible by
          construction, and the partial next card is then clipped by the
          scroll container's own right edge rather than by the viewport, which
          is the behaviour that was wanted anyway.

          Revealed as one block, deliberately. A per-card stagger would run
          for the four or five cards nobody can see yet — the ones off the
          right edge — and the shopper would meet them already finished. The
          rail is one object arriving, not eight. */}
      <ScrollReveal delay={0.1}>
        <div
          ref={railRef}
          className={cx(
            "mt-6 flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:mt-8",
            "[--rail-gap:0.75rem] gap-(--rail-gap) md:[--rail-gap:1.25rem]",
            VISIBLE,
            /* The native bar is redundant next to the progress rule below. */
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {products.map((product) => (
            <div key={product.slug} className={cx("shrink-0 snap-start", CARD_WIDTH)}>
              <ProductCard
                product={product}
                sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 26vw, (min-width: 640px) 32vw, 42vw"
              />
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* ── Progress ──────────────────────────────────────────────────────
          A third of the track, travelling across it. Only when there is
          something to travel — with three recommendations on a wide screen
          there is no overflow and no bar. */}
      {overflows ? (
        <div aria-hidden="true" className="bg-line mt-6 h-px w-full overflow-hidden md:mt-8">
          <div
            ref={progressRef}
            className="bg-ink h-px w-1/3 transition-transform duration-150 ease-out"
          />
        </div>
      ) : null}

      {/* Clear of the scroller on a phone, so the tap target is nowhere near
          a horizontal gesture area. */}
      <p
        className={cx(
          "text-center",
          overflows ? "mt-8" : "border-line mt-8 border-t pt-8",
        )}
      >
        <Link
          href={showAllHref}
          className="group/all text-caption text-ink relative inline-block py-2 uppercase"
        >
          {showAllLabel}{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 ease-(--ease-settle) group-hover/all:translate-x-1"
          >
            →
          </span>
          {/* An underline that draws from the left rather than switching on. */}
          <span
            aria-hidden="true"
            className="bg-ink absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-300 ease-(--ease-settle) group-hover/all:scale-x-100 group-focus-visible/all:scale-x-100"
          />
        </Link>
      </p>
    </section>
  );
}

/**
 * A hairline control, 32px square. Ink on hover with the glyph nudging the
 * way it will travel; greyed and inert at the end of its run so neither
 * arrow is ever a lie about what will happen.
 */
function RailArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const next = direction === "next";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={next ? "Next recommendations" : "Previous recommendations"}
      className={cx(
        "group/arrow flex h-8 w-8 items-center justify-center border transition-[color,border-color,opacity] duration-300 ease-(--ease-settle)",
        disabled
          ? "border-line text-grey/35 cursor-not-allowed"
          : "border-line text-ink hover:border-ink active:scale-95",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "text-caption inline-block transition-transform duration-300 ease-(--ease-settle)",
          !disabled && (next ? "group-hover/arrow:translate-x-0.5" : "group-hover/arrow:-translate-x-0.5"),
        )}
      >
        {next ? "→" : "←"}
      </span>
    </button>
  );
}
