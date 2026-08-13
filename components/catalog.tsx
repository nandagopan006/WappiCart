"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { ProductCard } from "@/components/product-card";
import { ShowroomReveal } from "@/components/showroom-reveal";
import { Wave } from "@/components/wave";
import { SizeRun } from "@/components/size-run";
import { EASE_SETTLE_POINTS } from "@/lib/motion";
import {
  CATEGORIES,
  PRICE_BANDS,
  inPriceBand,
  type Category,
  type PriceBandId,
  type Product,
} from "@/lib/products";
import { buildStockEnquiryLink } from "@/lib/whatsapp";
import { cx } from "@/lib/cx";

/**
 * The shelf. Filtering and sorting are instant and client-side — twelve
 * products needs no server, and a round trip to reorder a list the browser
 * already holds is the difference between a catalogue and a form.
 *
 * Category and price band are one-of; sizes are many-of. Picking 9 and 10 means
 * "show me anything I could actually wear", which is how someone with a foot
 * between sizes shops.
 *
 * ── The controls ─────────────────────────────────────────────────────────
 * Two presentations of one state, chosen by width rather than duplicated.
 *
 * On desktop the categories stay where they have always been — plain text
 * labels in the sticky bar with the ember underline marking the live one. That
 * bar is the page's signature and it is fast: five shelves, one click, nothing
 * to open. Size and price sit behind `size & price` beside `sort`, because they
 * are the deeper cut and do not deserve permanent furniture.
 *
 * Below `md` all five shelves plus a six-button size run will not fit on one
 * line, and the honest options are a scrolling strip or a panel. A strip that
 * scrolls sideways hides half its own options, so the bar collapses to `filter`
 * and `sort`, and the panel carries the shelves as well. One state either way —
 * the category row inside the panel is `md:hidden`, so no shopper is ever
 * looking at two category pickers at once.
 *
 * ── The reveal ───────────────────────────────────────────────────────────
 * Products arrive through `ShowroomReveal`, the same curtain the homepage and
 * the about page use: a clip rises from the bottom edge while the card comes
 * forward out of blur, staggered a column at a time. Every pair is remembered
 * once it has arrived — see `revealed` below — so a shelf being re-sorted moves
 * rather than re-unveiling itself.
 *
 * ── The filter morph ─────────────────────────────────────────────────────
 * Changing a filter REARRANGES the shelf instead of redrawing it: surviving
 * cards slide to their new positions, leaving cards fade and shrink out on the
 * spot, arriving cards rise in. Sorting is the same machinery with nothing
 * leaving — every pair walks to its new place. The shopper watches the shelf
 * being re-ordered rather than replaced, which is what a filter actually does.
 *
 * This is the one job on the site that genuinely needs Framer Motion: a layout
 * animation requires knowing every card's position before AND after a React
 * re-render, which is exactly what the `layout` prop does and what hand-rolled
 * CSS cannot. `mode="popLayout"` takes leaving cards out of the flow
 * immediately, so the survivors start sliding at once instead of waiting for
 * the exit to finish.
 *
 * Under reduced motion every animation prop turns off, the panel opens without
 * a transition, and a filter is an instant swap.
 */

/* The one easing, typed as the cubic-bezier tuple Motion expects. */
const SETTLE: [number, number, number, number] = [...EASE_SETTLE_POINTS];

/* Desktop column count. Only used to stagger the reveal a row at a time, so a
   two-column phone gets a slightly different cadence and nothing else. */
const COLUMNS = 3;

type SortKey = "featured" | "new" | "price-asc" | "price-desc";

/**
 * Four orderings, and no more.
 *
 * "New in" rather than "newest": the data carries an `isNew` flag and no dates,
 * so this sorts the flagged pairs to the front and leaves the rest in shelf
 * order. Calling it "newest" would promise an ordering we cannot actually back.
 */
const SORTS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: "featured", label: "featured" },
  { key: "new", label: "new in" },
  { key: "price-asc", label: "price: low to high" },
  { key: "price-desc", label: "price: high to low" },
];

type Panel = "filter" | "sort" | null;

export function Catalog({ products, sizesInStock }: { products: Product[]; sizesInStock: number[] }) {
  /* The homepage's category rows arrive as /shop?c=loafers, so the filter is
     already applied when the page opens. Validated against CATEGORIES rather
     than trusted — ?c=anything would otherwise show an empty shelf and read as
     a bug. */
  const requested = useSearchParams().get("c");
  const initialCategory = CATEGORIES.find((c) => c === requested) ?? null;

  const [category, setCategory] = useState<Category | null>(initialCategory);
  const [sizes, setSizes] = useState<number[]>([]);
  const [band, setBand] = useState<PriceBandId | null>(null);
  const [sort, setSort] = useState<SortKey>("featured");
  const [panel, setPanel] = useState<Panel>(null);
  const reduced = useReducedMotion();

  /* The split header's category rows link to /shop?c=x from within /shop.
     Same route, so this component never remounts — state initialised from the
     URL once would go stale and the click would silently do nothing. This
     keeps the URL authoritative whenever it changes. */
  useEffect(() => {
    setCategory(CATEGORIES.find((c) => c === requested) ?? null);
  }, [requested]);

  /* Which pairs have finished arriving. A ref rather than state on purpose:
     nothing about the page should re-render because a curtain finished, and by
     the time this is read again — on the next filter or sort — it is current.

     Without it, filtering to "loafers" and back would make every returning pair
     unveil itself a second time, and the shelf would look like it was loading
     rather than re-sorting. */
  const revealed = useRef(new Set<string>());
  const markRevealed = useCallback((slug: string) => {
    revealed.current.add(slug);
  }, []);

  const visible = useMemo(() => {
    /* Shelf order — the sequence in products.json — is the tie-breaker under
       every sort, so two pairs at the same price never swap places between
       renders for no reason. */
    const shelf = new Map(products.map((p, i) => [p.slug, i] as const));
    const byShelf = (a: Product, b: Product) => (shelf.get(a.slug) ?? 0) - (shelf.get(b.slug) ?? 0);

    const filtered = products.filter(
      (p) =>
        (category === null || p.category === category) &&
        (sizes.length === 0 || sizes.some((s) => p.sizes.includes(s))) &&
        (band === null || inPriceBand(p, band)),
    );

    const flagFirst = (flag: keyof Product) => (a: Product, b: Product) =>
      Number(Boolean(b[flag])) - Number(Boolean(a[flag])) || byShelf(a, b);

    switch (sort) {
      case "new":
        return filtered.sort(flagFirst("isNew"));
      case "price-asc":
        return filtered.sort((a, b) => a.price - b.price || byShelf(a, b));
      case "price-desc":
        return filtered.sort((a, b) => b.price - a.price || byShelf(a, b));
      case "featured":
      default:
        return filtered.sort(flagFirst("featured"));
    }
  }, [products, category, sizes, band, sort]);

  /* Live counts beside each price band, so a band that has nothing in it says
     so rather than leading the shopper to an empty shelf. */
  const bandCounts = useMemo(
    () =>
      Object.fromEntries(
        PRICE_BANDS.map((b) => [b.id, products.filter((p) => inPriceBand(p, b.id)).length]),
      ) as Record<PriceBandId, number>,
    [products],
  );

  /* Two counts, because the two buttons hold different things. On desktop the
     shelf is picked in the bar, so the `size & price` door must not claim it. */
  const deepFilters = (sizes.length > 0 ? 1 : 0) + (band ? 1 : 0);
  const activeFilters = deepFilters + (category ? 1 : 0);

  const clearFilters = useCallback(() => {
    setCategory(null);
    setSizes([]);
    setBand(null);
  }, []);

  /* Escape closes, and so does a press anywhere outside the bar. Both are what
     someone expects of a panel hanging off a toolbar, and without the second
     one the panel stays open over the shelf it was used to narrow. */
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setPanel(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [panel]);

  /* Every card carries a scroll-driven parallax and a scroll-triggered reveal,
     and both cache the page geometry they were built against. Filtering changes
     the height of the grid underneath them, so without this every trigger below
     the fold is measuring against a page that no longer exists.

     Deliberately after the 400ms layout tween has landed rather than during it:
     refreshing mid-morph measures cards in transit. */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => window.clearTimeout(id);
  }, [visible]);

  const togglePanel = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  return (
    <section>
      {/* Spoken, not just shown. A filter that silently changes the length of a
          list tells a screen reader nothing, and the visible count above is
          `hidden` below lg — a display:none live region announces nothing, so
          the announcement has to be its own always-rendered element. */}
      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "style" : "styles"} on the shelf
      </p>

      {/* Sticks once the page header has scrolled past. */}
      <div ref={barRef} className="bg-blush/85 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-page mx-auto px-5 md:px-8">
          <div className="flex items-center justify-between gap-x-6 py-3">
            {/* Desktop: the shelves stay in the open. Five names, one click. */}
            <div className="hidden flex-wrap items-center gap-x-5 gap-y-1 md:flex">
              <FilterLabel active={category === null} onClick={() => setCategory(null)}>
                all
              </FilterLabel>
              {CATEGORIES.map((c) => (
                <FilterLabel key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </FilterLabel>
              ))}
            </div>

            {/* Phone: one door, holding the shelves and everything else. */}
            <ControlButton
              className="md:hidden"
              open={panel === "filter"}
              count={activeFilters}
              controls="catalog-filter-panel"
              onClick={() => togglePanel("filter")}
            >
              filter
            </ControlButton>

            <div className="flex shrink-0 items-center gap-x-5">
              {/* The count only has room to show itself on a wide screen. */}
              <p className="font-mono text-utility text-muted hidden tabular-nums lg:block">
                {String(visible.length).padStart(2, "0")} {visible.length === 1 ? "style" : "styles"}
              </p>

              <ControlButton
                className="hidden md:inline-flex"
                open={panel === "filter"}
                count={deepFilters}
                controls="catalog-filter-panel"
                onClick={() => togglePanel("filter")}
              >
                size &amp; price
              </ControlButton>

              <ControlButton
                open={panel === "sort"}
                controls="catalog-sort-panel"
                onClick={() => togglePanel("sort")}
              >
                sort
              </ControlButton>
            </div>
          </div>

          <Wave />

          {/* Move 2, RISE, applied to a panel: opacity and a little height, and
              nothing else. The bar it hangs from is already blurred, so the
              panel inherits the frosting rather than growing its own. */}
          <AnimatePresence initial={false}>
            {panel !== null ? (
              <motion.div
                key={panel}
                id={panel === "filter" ? "catalog-filter-panel" : "catalog-sort-panel"}
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.34, ease: SETTLE }}
                className="overflow-hidden"
              >
                <motion.div
                  initial={reduced ? false : { y: -8 }}
                  animate={{ y: 0 }}
                  exit={{ y: -8 }}
                  transition={{ duration: reduced ? 0 : 0.34, ease: SETTLE }}
                  className="pt-6 pb-8"
                >
                  {panel === "filter" ? (
                    <FilterPanel
                      category={category}
                      onCategory={setCategory}
                      sizes={sizes}
                      onSizes={setSizes}
                      sizesInStock={sizesInStock}
                      band={band}
                      onBand={setBand}
                      bandCounts={bandCounts}
                      showing={visible.length}
                      activeFilters={activeFilters}
                      onClear={clearFilters}
                    />
                  ) : (
                    <SortPanel sort={sort} onSort={setSort} />
                  )}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-page mx-auto px-5 pt-12 md:px-8 md:pt-20">
        {visible.length > 0 ? (
          <div className="grid grid-cols-2 items-start gap-x-6 gap-y-14 md:grid-cols-3 md:gap-x-12 md:gap-y-24">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((product, i) => (
                <motion.div
                  key={product.slug}
                  layout={reduced ? false : true}
                  initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.4,
                    ease: SETTLE,
                    layout: { duration: 0.4, ease: SETTLE },
                  }}
                >
                  {/* The curtain, staggered a column at a time so a row lifts
                      as one gesture rather than twelve. `skip` is read at
                      render, which is after the previous pass recorded it — a
                      pair that has already arrived simply appears in its new
                      position and lets the layout tween carry it there. */}
                  <ShowroomReveal
                    index={i % COLUMNS}
                    skip={revealed.current.has(product.slug)}
                    onDone={() => markRevealed(product.slug)}
                  >
                    <ProductCard product={product} priority={i < 6} />
                  </ShowroomReveal>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyResult category={category} sizes={sizes} band={band} onClear={clearFilters} />
        )}
      </div>
    </section>
  );
}

/**
 * The filter's only control shape: a word that carries the ember underline when
 * it is live. Used for the shelves in the bar, the shelves in the panel, the
 * price bands and the sort options — four different jobs, one gesture, because
 * a page that invents a new control for every list is a dashboard.
 */
function FilterLabel({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** Shown in mono beside the label. Omitted where a count would be noise. */
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "text-body relative py-2 lowercase transition-colors",
        active ? "text-espresso" : "text-muted hover:text-espresso",
      )}
    >
      {children}
      {count !== undefined ? (
        <span className="font-mono text-utility text-muted ml-2 tabular-nums">
          {String(count).padStart(2, "0")}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={cx(
          "filter-underline absolute inset-x-0 bottom-1 h-px origin-left transition-transform duration-200 ease-(--ease-settle)",
          active ? "scale-x-100" : "scale-x-0",
        )}
      />
    </button>
  );
}

/** The two doors in the bar. A chevron, because a disclosure needs to say so. */
function ControlButton({
  open,
  count = 0,
  controls,
  onClick,
  className,
  children,
}: {
  open: boolean;
  count?: number;
  controls: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={cx(
        "text-body inline-flex items-center gap-2 py-2 lowercase transition-colors",
        open ? "text-espresso" : "text-muted hover:text-espresso",
        className,
      )}
    >
      {children}
      {count > 0 ? (
        <span className="font-mono text-utility text-espresso tabular-nums">
          {count}
          <span className="sr-only"> filters applied</span>
        </span>
      ) : null}
      <svg
        aria-hidden="true"
        focusable="false"
        width="9"
        height="6"
        viewBox="0 0 9 6"
        fill="none"
        className={cx(
          "transition-transform duration-300 ease-(--ease-settle)",
          open && "rotate-180",
        )}
      >
        <path d="M1 1.25 4.5 4.75 8 1.25" stroke="currentColor" strokeWidth="1" />
      </svg>
    </button>
  );
}

/** A mono rubric over each group in the panel. */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-utility text-muted mb-1 uppercase">{children}</p>;
}

function FilterPanel({
  category,
  onCategory,
  sizes,
  onSizes,
  sizesInStock,
  band,
  onBand,
  bandCounts,
  showing,
  activeFilters,
  onClear,
}: {
  category: Category | null;
  onCategory: (c: Category | null) => void;
  sizes: number[];
  onSizes: (s: number[]) => void;
  sizesInStock: number[];
  band: PriceBandId | null;
  onBand: (b: PriceBandId | null) => void;
  bandCounts: Record<PriceBandId, number>;
  showing: number;
  activeFilters: number;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
      {/* Phone only. On desktop these five live in the bar above, and two
          category pickers on one screen is one too many. */}
      <div className="md:hidden">
        <PanelLabel>Shelf</PanelLabel>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <FilterLabel active={category === null} onClick={() => onCategory(null)}>
            all
          </FilterLabel>
          {CATEGORIES.map((c) => (
            <FilterLabel key={c} active={category === c} onClick={() => onCategory(c)}>
              {c}
            </FilterLabel>
          ))}
        </div>
      </div>

      <div>
        <PanelLabel>Size</PanelLabel>
        {/* The shop's whole run, always. Sold-out sizes sit at 30% and cannot
            be tapped — hiding them would be easier and a small lie. */}
        <SizeRun
          multiple
          inStock={sizesInStock}
          selected={sizes}
          onSelect={onSizes}
          label="Filter by size"
          tone="filter"
          className="-ml-1"
        />
      </div>

      <div>
        <PanelLabel>Price</PanelLabel>
        <div className="flex flex-col items-start gap-y-1">
          {PRICE_BANDS.map((b) => (
            <FilterLabel
              key={b.id}
              active={band === b.id}
              count={bandCounts[b.id]}
              onClick={() => onBand(band === b.id ? null : b.id)}
            >
              {b.label}
            </FilterLabel>
          ))}
        </div>
      </div>

      <div className="border-muted/25 flex items-center justify-between gap-4 border-t pt-4 md:col-span-2">
        <p className="font-mono text-utility text-muted tabular-nums">
          {String(showing).padStart(2, "0")} {showing === 1 ? "style" : "styles"} on the shelf
        </p>
        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="link-underline text-body text-muted hover:text-espresso lowercase"
          >
            clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SortPanel({ sort, onSort }: { sort: SortKey; onSort: (s: SortKey) => void }) {
  return (
    <div>
      <PanelLabel>Sort by</PanelLabel>
      <div className="flex flex-col items-start gap-y-1 md:flex-row md:items-center md:gap-x-8">
        {SORTS.map((option) => (
          <FilterLabel key={option.key} active={sort === option.key} onClick={() => onSort(option.key)}>
            {option.label}
          </FilterLabel>
        ))}
      </div>
    </div>
  );
}

/** An empty screen is an invitation to act, so it points at WhatsApp. */
function EmptyResult({
  category,
  sizes,
  band,
  onClear,
}: {
  category: Category | null;
  sizes: number[];
  band: PriceBandId | null;
  onClear: () => void;
}) {
  const inSizes =
    sizes.length === 0 ? "" : sizes.length === 1 ? ` in size ${sizes[0]}` : ` in sizes ${sizes.join(" or ")}`;
  const what = category ?? "pairs";
  const atPrice = band ? ` ${PRICE_BANDS.find((b) => b.id === band)?.label.toLowerCase()}` : "";

  return (
    <div className="max-w-[42ch] py-8">
      <p className="text-body">
        No {what}
        {inSizes}
        {atPrice} right now — message us and we&rsquo;ll check the back.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <a
          href={buildStockEnquiryLink({ sizes, category: category ?? undefined })}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body decoration-muted/30 hover:decoration-espresso inline-block underline underline-offset-4"
        >
          Message us on WhatsApp
        </a>
        <button
          type="button"
          onClick={onClear}
          className="link-underline text-body text-muted hover:text-espresso lowercase"
        >
          clear filters
        </button>
      </div>
    </div>
  );
}
