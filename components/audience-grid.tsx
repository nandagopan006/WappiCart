import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ScrollReveal } from "@/components/scroll-reveal";
import type { Category } from "@/lib/catalogue";

export type AudienceEntry = {
  /** The shelf's slug. Only ever used to build the link. */
  category: Category;
  /** The shelf's name, which is what a shopper reads. */
  label: string;
  count: number;
  /**
   * The photograph. Resolved by the caller: the shelf's own if one has been
   * set in the admin, otherwise its lead pair's — which is what the admin's
   * "blank uses the shelf's lead product" actually means.
   */
  image: string;
};

/**
 * The shelves as full-bleed photographs, edge to edge, no gutters.
 *
 * A band of uninterrupted imagery after a page of white margins is the point —
 * it is the one place the layout stops being a catalogue and behaves like a
 * lookbook. The tiles touch, so the row reads as a single strip.
 *
 * Hover is three things at once and all of them are small: the picture eases
 * up 3%, the scrim deepens so the name keeps its contrast, and an arrow
 * resolves in beside the name. It holds its space at rest, so nothing shifts.
 * On a touch screen the whole tile is simply the tap target.
 *
 * ── Why the tiles have computed widths ───────────────────────────────────
 * This was two columns and four columns of identical tiles, which was exactly
 * right while the shop had exactly four shelves. Shelves are rows the admin
 * creates now, so any count has to land — and five shelves in a four-column
 * grid leaves three empty cells in the last row, which on a white page reads
 * as an unfinished strip rather than a deliberate one.
 *
 * So the last row's tiles share whatever columns are left. Their aspect ratio
 * is scaled by the same factor as their width, which is what keeps every row
 * the same height: a tile twice as wide is twice as wide a ratio, not twice as
 * tall a box. The photographs are `object-cover`, so a wider tile simply crops
 * wider. Three shelves fill the strip; so do five, seven or one.
 */

/** The strip's column count at each breakpoint, and the tile ratio there. */
const LAYOUT = {
  sm: { columns: 2, width: 4, height: 5 },
  lg: { columns: 4, width: 3, height: 4 },
} as const;

/**
 * How many columns each tile occupies.
 *
 * Every tile is one column until the last incomplete row, whose tiles divide
 * the remaining columns between them — as evenly as they go, with the leftover
 * handed to the leading tiles. The spans in a row always sum to `columns`, so
 * there is never a gap.
 */
function spans(count: number, columns: number): number[] {
  const remainder = count % columns;
  const full = count - remainder;

  const result = Array.from({ length: full }, () => 1);
  if (remainder === 0) return result;

  const base = Math.floor(columns / remainder);
  /* The first few get one extra column, so the row adds up exactly. */
  const extra = columns % remainder;

  for (let i = 0; i < remainder; i += 1) result.push(base + (i < extra ? 1 : 0));

  return result;
}

export function AudienceGrid({ entries }: { entries: AudienceEntry[] }) {
  const smSpans = spans(entries.length, LAYOUT.sm.columns);
  const lgSpans = spans(entries.length, LAYOUT.lg.columns);

  return (
    <section aria-label="Shop by category">
      <ScrollReveal stagger className="grid grid-cols-2 lg:grid-cols-4">
        {entries.map(({ category, label, count, image }, index) => {
          const sm = smSpans[index];
          const lg = lgSpans[index];

          return (
            <Link
              key={category}
              href={`/shop?c=${category}`}
              className="audience-tile group relative block overflow-hidden focus-visible:outline-offset-[-4px]"
              style={
                {
                  "--tile-span-sm": sm,
                  "--tile-span-lg": lg,
                  /* Written out rather than computed in CSS: a calc() inside an
                     aspect-ratio is not reliably supported, and the numbers are
                     already known here. */
                  "--tile-ratio-sm": `${sm * LAYOUT.sm.width} / ${LAYOUT.sm.height}`,
                  "--tile-ratio-lg": `${lg * LAYOUT.lg.width} / ${LAYOUT.lg.height}`,
                } as CSSProperties
              }
            >
              <Image
                src={image}
                alt=""
                fill
                /* A tile that spans two columns needs twice the picture. */
                sizes={`(min-width: 1024px) ${lg * 25}vw, ${sm * 50}vw`}
                className="tile-media object-cover"
              />

              {/* Decorative — the link's own text names the destination, and a
                  screen reader does not need the photograph described twice. */}
              <div aria-hidden="true" className="tile-scrim absolute inset-0" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-6">
                <div>
                  <h3 className="text-title text-paper font-light lowercase">{label}</h3>
                  <p className="text-caption text-paper/70 mt-1 tabular-nums uppercase">
                    {count} {count === 1 ? "style" : "styles"}
                  </p>
                </div>
                <span aria-hidden="true" className="tile-arrow text-paper text-title">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </ScrollReveal>
    </section>
  );
}
