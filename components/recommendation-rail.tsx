"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { cx } from "@/lib/cx";
import type { Product } from "@/lib/products";

/**
 * A short row of pairs to keep looking at, scrolled sideways.
 *
 * ── It renders the real product card ─────────────────────────────────────
 * Not a smaller copy of one. Every tile here keeps its heart, its hover
 * image swap, its price and its link, because it *is* the same component —
 * only the slot around it is narrower. A second card implementation would be
 * a second design system to keep in step.
 *
 * The only thing overridden is `sizes`: these slots are ~230px, and the
 * grid's value would have next/image fetch a 466px source for each of eight.
 *
 * ── The scrolling ────────────────────────────────────────────────────────
 * A plain `overflow-x-auto` strip with scroll snapping. Native everywhere:
 * a phone swipes it, a trackpad scrolls it sideways, a keyboard tabs through
 * it and the browser scrolls it into view. Nothing is intercepted, so
 * vertical scrolling over the row still moves the page — the row is never a
 * trap.
 *
 * It does not autoplay. A row that moves on its own takes the decision to
 * look away from the reader, and is the single fastest way to make a
 * catalogue feel like an advert.
 *
 * The arrows are desktop-only garnish over that: they call `scrollBy`, and
 * they disable themselves at each end so neither is ever a dead control. On
 * a touch screen they are not rendered at all — the finger is the control.
 */
export function RecommendationRail({
  products,
  heading,
  showAllHref = "/shop",
  showAllLabel = "Explore the full collection",
}: {
  products: Product[];
  heading: string;
  showAllHref?: string;
  showAllLabel?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /* Which arrows are live. Read from the element rather than tracked in
     state as the user scrolls, so a swipe, a keyboard tab and an arrow press
     all resolve to the same answer. */
  const sync = useCallback(() => {
    const node = railRef.current;
    if (!node) return;

    const max = node.scrollWidth - node.clientWidth;
    setAtStart(node.scrollLeft <= 1);
    /* A pixel of slack: sub-pixel widths mean scrollLeft rarely lands exactly
       on the maximum, and a "next" arrow that stays live at the end is worse
       than no arrow. */
    setAtEnd(node.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    sync();
    const node = railRef.current;
    if (!node) return;

    node.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      node.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, products.length]);

  const nudge = useCallback((direction: 1 | -1) => {
    const node = railRef.current;
    if (!node) return;
    /* Most of a screenful, not all of it — leaving a tile visible tells the
       reader the row moved rather than replaced itself. */
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="mt-section" aria-label={heading}>
      <div className="section-index">
        <h2 className="text-caption text-ink uppercase">{heading}</h2>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <RailArrow direction="previous" disabled={atStart} onClick={() => nudge(-1)} />
          <RailArrow direction="next" disabled={atEnd} onClick={() => nudge(1)} />
        </div>
      </div>

      {/* `-mx-4 px-4` on mobile so the row bleeds to the screen edge and the
          last tile does not look clipped by a margin. The scrollbar is hidden
          because the arrows and the bleed already say it scrolls. */}
      <div
        ref={railRef}
        className={cx(
          "-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {products.map((product) => (
          <div key={product.slug} className="w-[46vw] shrink-0 snap-start sm:w-[230px]">
            <ProductCard product={product} sizes="(min-width: 640px) 230px, 46vw" />
          </div>
        ))}
      </div>

      <p className="border-line mt-8 border-t pt-6 text-center">
        <Link href={showAllHref} className="link-quiet text-caption text-ink group/all uppercase">
          {showAllLabel}{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 ease-(--ease-settle) group-hover/all:translate-x-1"
          >
            →
          </span>
        </Link>
      </p>
    </section>
  );
}

/** A hairline square, ink on hover, greyed and inert at the end of its run. */
function RailArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "next" ? "Scroll to more pairs" : "Scroll back"}
      className={cx(
        "border-line text-ink flex h-8 w-8 items-center justify-center border transition-colors",
        disabled ? "text-grey/40 cursor-not-allowed" : "hover:border-ink",
      )}
    >
      <span aria-hidden="true" className="text-caption">
        {direction === "next" ? "→" : "←"}
      </span>
    </button>
  );
}
