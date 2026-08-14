import Image from "next/image";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import type { Category, Product } from "@/lib/products";

export type AudienceEntry = {
  category: Category;
  count: number;
  product: Product;
};

/**
 * The four shelves as full-bleed photographs, edge to edge, no gutters.
 *
 * A band of uninterrupted imagery after a page of white margins is the point —
 * it is the one place the layout stops being a catalogue and behaves like a
 * lookbook. The tiles touch, so the row reads as a single strip.
 *
 * Hover is three things at once and all of them are small: the picture eases
 * up 3%, the scrim deepens so the name keeps its contrast, and an arrow
 * resolves in beside the name. It holds its space at rest, so nothing shifts.
 * On a touch screen the whole tile is simply the tap target.
 */
export function AudienceGrid({ entries }: { entries: AudienceEntry[] }) {
  return (
    <section aria-label="Shop by category">
      <ScrollReveal stagger className="grid grid-cols-2 lg:grid-cols-4">
        {entries.map(({ category, count, product }) => (
          <Link
            key={category}
            href={`/shop?c=${category}`}
            className="group relative block aspect-4/5 overflow-hidden focus-visible:outline-offset-[-4px] lg:aspect-3/4"
          >
            <Image
              src={product.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="tile-media object-cover"
            />

            {/* Decorative — the link's own text names the destination, and a
                screen reader does not need the photograph described twice. */}
            <div aria-hidden="true" className="tile-scrim absolute inset-0" />

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-6">
              <div>
                <h3 className="text-title text-paper font-light lowercase">{category}</h3>
                <p className="text-caption text-paper/70 mt-1 tabular-nums uppercase">
                  {count} {count === 1 ? "style" : "styles"}
                </p>
              </div>
              <span aria-hidden="true" className="tile-arrow text-paper text-title">
                →
              </span>
            </div>
          </Link>
        ))}
      </ScrollReveal>
    </section>
  );
}
