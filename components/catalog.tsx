"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProductGrid } from "@/components/product-grid";
import { SizeRun } from "@/components/size-run";
import {
  PRICE_BANDS,
  inPriceBand,
  type Category,
  type PriceBandId,
  type Product,
  type Shelf,
} from "@/lib/catalogue";
import { buildStockEnquiryLink, type ShopContact } from "@/lib/whatsapp";
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
 * One thin row above the grid: shelves on the left, count and two doors on the
 * right. The doors hold size, price and sort, because those are the deeper cut
 * and do not deserve permanent furniture in a catalogue this small.
 *
 * Nothing here animates. A filter is an instant swap — a grid that tweens into
 * its new arrangement makes the shopper wait to read the result of their own
 * click.
 */

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

/**
 * How many pairs a page of the shelf holds.
 *
 * Six is two full rows of the three-up grid, so a page always ends on a
 * complete row — a load-more that leaves one orphan tile hanging looks like a
 * layout bug rather than a boundary.
 */
const PAGE_SIZE = 6;

export function Catalog({
  products,
  shelves,
  sizesInStock,
  shop,
  initialCategory,
}: {
  products: Product[];
  /* The visible shelves, in the admin's order. Sent from the server rather
     than imported: they are rows in the database now, and this runs in the
     browser. */
  shelves: Shelf[];
  sizesInStock: number[];
  /* Only used by the empty state's "message us" link. A Client Component
     cannot read `lib/shop`, which is server-only now. */
  shop: ShopContact;
  /**
   * The shelf `?c=` asked for, already checked by the server.
   *
   * Passed in rather than read here, so the first paint on the server already
   * has the right products in it. Reading the URL inside this component meant
   * the server could only render a placeholder — which left the shop page
   * empty for search engines and for anyone without JavaScript.
   */
  initialCategory?: Category | null;
}) {
  /* Kept so a later click on a header shelf link — same route, no remount —
     still moves the filter. The first render uses what the server worked out. */
  const requested = useSearchParams().get("c");

  const [category, setCategory] = useState<Category | null>(initialCategory ?? null);
  const [sizes, setSizes] = useState<number[]>([]);
  const [band, setBand] = useState<PriceBandId | null>(null);
  const [sort, setSort] = useState<SortKey>("featured");
  const [panel, setPanel] = useState<Panel>(null);

  /**
   * How many of the filtered pairs are on screen.
   *
   * The whole catalogue is already in the browser — twelve products ship with
   * the page — so "loading more" is slicing an array the client already holds.
   * There is no request to make and nothing to wait for, which is why there is
   * no spinner and no pending state here: a loading indicator for work that
   * takes no time is a lie about the interface.
   *
   * If the shelf ever outgrows what is sensible to ship at once, this is the
   * seam: `shown` becomes a cursor and this component fetches the next page.
   * Nothing above it has to change.
   */
  const [shown, setShown] = useState(PAGE_SIZE);

  /* The header's category links point to /shop?c=x from within /shop. Same
     route, so this component never remounts — state initialised from the URL
     once would go stale and the click would silently do nothing. This keeps
     the URL authoritative whenever it changes. */
  useEffect(() => {
    setCategory(shelves.find((s) => s.slug === requested)?.slug ?? null);
  }, [requested, shelves]);

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

  /* Any change to the filters or the ordering starts the shelf over.
     Without this, narrowing to four loafers after having loaded twelve pairs
     would leave `shown` at 12 — harmless — but widening again would silently
     reveal everything at once, and the shopper would never see the boundary
     they had been clicking through. */
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [category, sizes, band, sort]);

  const page = visible.slice(0, shown);
  const remaining = visible.length - page.length;

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
     shelf is picked in the row, so the `size & price` door must not claim it. */
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

  const togglePanel = (next: Exclude<Panel, null>) =>
    setPanel((current) => (current === next ? null : next));

  return (
    <section className="max-w-page mx-auto px-4 md:px-8">
      {/* Spoken, not just shown. A filter that silently changes the length of a
          list tells a screen reader nothing, and the visible count is hidden
          below sm — a display:none live region announces nothing, so the
          announcement has to be its own always-rendered element. */}
      <p aria-live="polite" className="sr-only">
        Showing {page.length} of {visible.length} {visible.length === 1 ? "style" : "styles"} on the
        shelf
      </p>

      <div ref={barRef} className="border-line border-b">
        <div className="text-caption flex items-center justify-between gap-4 py-3 uppercase">
          {/* The shelves stay in the open from sm up. One click each, and it
              wraps rather than scrolls now that the shop can have any number
              of them. */}
          <div className="hidden flex-wrap items-center gap-x-6 gap-y-1 sm:flex">
            <FilterLabel active={category === null} onClick={() => setCategory(null)}>
              all
            </FilterLabel>
            {shelves.map((shelf) => (
              <FilterLabel
                key={shelf.slug}
                active={category === shelf.slug}
                onClick={() => setCategory(shelf.slug)}
              >
                {shelf.name}
              </FilterLabel>
            ))}
          </div>

          {/* Phone: one door, holding the shelves and everything else. */}
          <ControlButton
            className="sm:hidden"
            open={panel === "filter"}
            count={activeFilters}
            controls="catalog-filter-panel"
            onClick={() => togglePanel("filter")}
          >
            filter
          </ControlButton>

          <div className="flex shrink-0 items-center gap-x-6">
            <p className="text-grey hidden tabular-nums lg:block">
              {String(visible.length).padStart(2, "0")}{" "}
              {visible.length === 1 ? "style" : "styles"}
            </p>

            <ControlButton
              className="hidden sm:inline-flex"
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

        {panel !== null ? (
          <div
            id={panel === "filter" ? "catalog-filter-panel" : "catalog-sort-panel"}
            className="border-line border-t py-6"
          >
            {panel === "filter" ? (
              <FilterPanel
                category={category}
                onCategory={setCategory}
                shelves={shelves}
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
          </div>
        ) : null}
      </div>

      <div className="pt-10 pb-section">
        {visible.length > 0 ? (
          <>
            <ProductGrid products={page} priorityCount={3} />
            <LoadMore
              shown={page.length}
              total={visible.length}
              step={Math.min(PAGE_SIZE, remaining)}
              onMore={() => setShown((current) => current + PAGE_SIZE)}
            />
          </>
        ) : (
          <EmptyResult
            /* The shelf's name, not its slug: this text is read by a shopper
               and copied into a WhatsApp message. A slug reads as
               "running-shoes" in both. */
            category={category === null ? null : (shelfName(shelves, category) ?? category)}
            sizes={sizes}
            band={band}
            shop={shop}
            onClear={clearFilters}
          />
        )}
      </div>
    </section>
  );
}

/**
 * The end of a page of the shelf.
 *
 * Three things, in the order a shopper needs them: how far through they are,
 * how far there is to go, and the way to go further.
 *
 * ── Why a button and not an infinite scroll ──────────────────────────────
 * A shelf that loads as you reach the bottom takes the footer away from
 * anyone trying to reach it, and it removes the one moment where a shopper
 * decides whether to keep looking. A count and a button hand that decision
 * back. It is also the only version that works with a keyboard.
 *
 * The progress rule is the same hairline the rest of the page is built from,
 * filled to the proportion seen. It replaces the "page 1 of 2" that a
 * numbered pager would need — with a continuous list, position is a fraction
 * rather than a page number.
 */
function LoadMore({
  shown,
  total,
  step,
  onMore,
}: {
  shown: number;
  total: number;
  /** How many the next press will add. Shown so the button is a promise. */
  step: number;
  onMore: () => void;
}) {
  /* One page holds everything — there is nothing to say. */
  if (total <= PAGE_SIZE) return null;

  const done = shown >= total;

  return (
    <div className="mt-16 flex flex-col items-center gap-6">
      {/* The rule, filled to the proportion seen. */}
      <div aria-hidden="true" className="bg-line h-px w-full max-w-xs overflow-hidden">
        <div
          className="bg-ink h-px transition-[width] duration-500 ease-(--ease-settle)"
          style={{ width: `${Math.round((shown / total) * 100)}%` }}
        />
      </div>

      <p className="text-caption text-grey tabular-nums uppercase">
        Showing {shown} of {total}
      </p>

      {done ? (
        <p className="text-caption text-grey uppercase">That is the whole shelf.</p>
      ) : (
        <button
          type="button"
          onClick={onMore}
          className="text-caption border-ink bg-paper text-ink hover:bg-ink hover:text-paper inline-flex h-13 items-center gap-2 border px-10 uppercase transition-colors"
        >
          Load more
          {/* Opacity rather than a grey token: the button inverts on hover,
              and a fixed grey would drop to unreadable against the ink fill. */}
          <span className="tabular-nums opacity-50">({step})</span>
        </button>
      )}
    </div>
  );
}

/**
 * The filter's only control shape: a word that goes ink and underlined when it
 * is live. Used for the shelves, the price bands and the sort options — three
 * different jobs, one gesture, because a page that invents a new control for
 * every list is a dashboard.
 */
function FilterLabel({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** Shown beside the label. Omitted where a count would be noise. */
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "py-1 uppercase transition-colors",
        active
          ? "text-ink underline decoration-1 underline-offset-4"
          : "text-grey hover:text-ink",
      )}
    >
      {children}
      {count !== undefined ? (
        <span className="text-grey ml-2 tabular-nums">{String(count).padStart(2, "0")}</span>
      ) : null}
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
        "inline-flex items-center gap-2 py-1 uppercase transition-colors",
        open ? "text-ink" : "text-grey hover:text-ink",
        className,
      )}
    >
      {children}
      {count > 0 ? (
        <span className="text-ink tabular-nums">
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
        className={cx("transition-transform duration-200", open && "rotate-180")}
      >
        <path d="M1 1.25 4.5 4.75 8 1.25" stroke="currentColor" strokeWidth="1" />
      </svg>
    </button>
  );
}

/** A rubric over each group in the panel. */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-caption text-grey mb-2 uppercase">{children}</p>;
}

function FilterPanel({
  category,
  onCategory,
  shelves,
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
  shelves: Shelf[];
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
    <div className="grid gap-8 sm:grid-cols-2 lg:gap-16">
      {/* Phone only. From sm up these live in the row above, and two category
          pickers on one screen is one too many. */}
      <div className="sm:hidden">
        <PanelLabel>Shelf</PanelLabel>
        <div className="text-caption flex flex-wrap items-center gap-x-5 gap-y-1">
          <FilterLabel active={category === null} onClick={() => onCategory(null)}>
            all
          </FilterLabel>
          {shelves.map((shelf) => (
            <FilterLabel
              key={shelf.slug}
              active={category === shelf.slug}
              onClick={() => onCategory(shelf.slug)}
            >
              {shelf.name}
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
          className="-ml-1"
        />
      </div>

      <div>
        <PanelLabel>Price</PanelLabel>
        <div className="text-caption flex flex-col items-start gap-y-1">
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

      <div className="border-line text-caption flex items-center justify-between gap-4 border-t pt-4 uppercase sm:col-span-2">
        <p className="text-grey tabular-nums">
          {String(showing).padStart(2, "0")} {showing === 1 ? "style" : "styles"} on the shelf
        </p>
        {activeFilters > 0 ? (
          <button type="button" onClick={onClear} className="link-quiet text-grey hover:text-ink uppercase">
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
      <div className="text-caption flex flex-col items-start gap-y-1 sm:flex-row sm:items-center sm:gap-x-8">
        {SORTS.map((option) => (
          <FilterLabel key={option.key} active={sort === option.key} onClick={() => onSort(option.key)}>
            {option.label}
          </FilterLabel>
        ))}
      </div>
    </div>
  );
}

/** The shelf's readable name, for prose. Falls back to the slug. */
function shelfName(shelves: Shelf[], slug: string): string | undefined {
  return shelves.find((s) => s.slug === slug)?.name;
}

/**
 * An empty screen is an invitation to act, so it points at WhatsApp.
 *
 * `category` here is the shelf's NAME rather than its slug — the value lands
 * in a sentence a shopper reads and in the message the shop owner receives.
 */
function EmptyResult({
  category,
  sizes,
  band,
  shop,
  onClear,
}: {
  category: string | null;
  sizes: number[];
  band: PriceBandId | null;
  shop: ShopContact;
  onClear: () => void;
}) {
  const inSizes =
    sizes.length === 0 ? "" : sizes.length === 1 ? ` in size ${sizes[0]}` : ` in sizes ${sizes.join(" or ")}`;
  const what = category ? category.toLowerCase() : "pairs";
  const atPrice = band ? ` ${PRICE_BANDS.find((b) => b.id === band)?.label.toLowerCase()}` : "";

  return (
    <div className="mx-auto max-w-[46ch] py-16 text-center">
      <p className="text-body">
        No {what}
        {inSizes}
        {atPrice} right now — message us and we&rsquo;ll check the back.
      </p>
      <div className="text-caption mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 uppercase">
        <a
          href={buildStockEnquiryLink({ sizes, category: category ?? undefined, shop })}
          target="_blank"
          rel="noopener noreferrer"
          className="link-quiet text-ink"
        >
          Message us on WhatsApp
        </a>
        <button type="button" onClick={onClear} className="link-quiet text-grey hover:text-ink uppercase">
          clear filters
        </button>
      </div>
    </div>
  );
}
