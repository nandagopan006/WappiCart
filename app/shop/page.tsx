import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalog } from "@/components/catalog";
import { SectionHeading } from "@/components/section-heading";
import { products, sizesInStock } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Every pair on the shelf. Filter by category and size, then order the one you want on WhatsApp.",
  alternates: { canonical: "/shop" },
};

/**
 * The whole shelf, with the filters attached.
 *
 * No header photograph and no page hero — the shopper who lands here already
 * knows what a shoe shop sells, and every pixel above the first row of tiles
 * is a pixel of stock they have to scroll past.
 */
export default function ShopPage() {
  return (
    <div className="pt-10 md:pt-14">
      <div className="max-w-page mx-auto px-4 md:px-8">
        <SectionHeading as="h1">All shoes</SectionHeading>
      </div>

      {/* Catalog reads ?c= to pick up the category the header sends it. Without
          this boundary that hook would drag the whole route out of static
          rendering at build time.

          The fallback is what actually gets prerendered into /shop, so it is
          the first thing a shopper on a slow phone sees. Left empty, the page
          ships with the heading sitting on nothing and the shelf snapping in at
          hydration. */}
      <Suspense fallback={<CatalogPlaceholder />}>
        <Catalog products={products} sizesInStock={sizesInStock()} />
      </Suspense>
    </div>
  );
}

/**
 * The shelf before it is a shelf.
 *
 * Not skeleton cards — no fake headline bars, no fake price, and nothing
 * pulsing. It is the grid's own rhythm held open: the same four columns and
 * the same square plate, in the same mist the real tiles sit on. What arrives
 * on top of it lands in exactly the space it was already occupying, so there
 * is no shift to see.
 */
function CatalogPlaceholder() {
  return (
    <section className="max-w-page mx-auto px-4 md:px-8">
      <div className="border-line text-caption text-grey border-b py-3 uppercase">
        Loading the shelf
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-2 gap-x-4 gap-y-12 pt-10 pb-section sm:grid-cols-3 md:gap-x-6"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <div className="bg-mist aspect-square" />
          </div>
        ))}
      </div>
    </section>
  );
}
