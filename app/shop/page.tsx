import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { Catalog } from "@/components/catalog";
import { Rise } from "@/components/rise";
import { ShopIndex, type IndexEntry } from "@/components/shop-index";
import { SplitText } from "@/components/split-text";
import { Wave } from "@/components/wave";
import {
  CATEGORIES,
  countByCategory,
  featuredProducts,
  formatPrice,
  pairsInStock,
  previewByCategory,
  products,
  sizesInStock,
} from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every pair on the shelf. Filter by category and size, then order the one you want on WhatsApp.",
  alternates: { canonical: "/shop" },
};

/**
 * The catalogue opens on the split header from the reference: two panels,
 * full width, no gap. Blush left carries the page's name at display size with
 * a pair standing in the site's curved mask behind it; sand right carries the
 * shelves as an index with a photograph that answers the pointer. The seam
 * between the two fills is the composition.
 *
 * The category rows are real links (?c=), so the index is also the filter:
 * tapping "loafers" applies it in the catalogue below. Catalog watches the
 * URL for exactly this reason.
 */
export default function ShopPage() {
  const counts = countByCategory();
  const previews = previewByCategory(1);
  const featured = featuredProducts();
  const lead = featured[0];
  /* The index's resting preview is a different pair from the one standing in
     the left panel — the header was showing the same photograph twice, which
     reads as a bug rather than a motif. */
  const rest = featured[1] ?? lead;

  const entries: IndexEntry[] = [
    {
      href: "/shop",
      label: "all",
      count: products.length,
      image: rest.image,
      alt: rest.alt,
      caption: `${rest.name} — ${formatPrice(rest.price)}`,
    },
    ...CATEGORIES.map((c) => {
      const preview = previews[c][0];
      return {
        href: `/shop?c=${c}`,
        label: c,
        count: counts[c],
        image: preview.image,
        alt: preview.alt,
        caption: `${preview.name} — ${formatPrice(preview.price)}`,
      };
    }),
  ];

  return (
    <>
      {/* The curved mask, defined once for this page and referenced by the
          .hero-mask class — objectBoundingBox units stretch it to whatever it
          clips. */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
        <defs>
          <clipPath id="wappicart-shoe-mask" clipPathUnits="objectBoundingBox">
            <path d="M0 0 L0.55 0 C0.88 0.06 1 0.28 1 0.52 C1 0.78 0.84 0.96 0.55 1 L0 1 Z" />
          </clipPath>
        </defs>
      </svg>

      <header className="grid md:grid-cols-2">
        <div className="bg-blush relative flex flex-col justify-between gap-14 overflow-hidden px-5 py-14 md:px-10 md:py-20 lg:px-14">
          {/* A pair standing behind the page's name, in the same curved mask
              the hero uses — the panel was a title floating in empty blush,
              and a catalogue cover with no shoe on it is a strange thing for
              a shoe shop to print. */}
          <div
            aria-hidden="true"
            className="hero-mask hero-shoe absolute top-[6%] right-[-6%] hidden aspect-3/4 w-[46%] max-w-[19rem] rotate-2 md:block"
          >
            <Image src={lead.image} alt="" fill priority sizes="19rem" className="object-cover" />
          </div>

          <Rise>
            <p className="font-mono text-utility text-muted relative uppercase">The catalogue</p>
          </Rise>

          <div className="@container relative">
            <SplitText
              as="h1"
              onScroll
              stagger={0.03}
              className="type-display text-espresso block leading-[0.92] text-[clamp(3rem,14cqw,7.5rem)] tracking-[-0.02em]"
            >
              Every pair
            </SplitText>
            <Rise index={1}>
              <p className="font-mono text-utility text-muted mt-6 uppercase">
                {products.length} styles · {pairsInStock()} pairs in stock
              </p>
            </Rise>
          </div>
        </div>

        <div className="bg-sand flex flex-col justify-center px-5 py-12 md:px-10 md:py-16 lg:px-14">
          <ShopIndex entries={entries} />
        </div>
      </header>

      {/* Catalog reads ?c= to pick up the category the header and homepage
          send it. Without this boundary that hook would drag the whole route
          out of static rendering at build time.

          The fallback is what actually gets prerendered into /shop, so it is
          the first thing a shopper on a slow phone sees. Left empty, the page
          ships with the header sitting on nothing and the shelf snapping in at
          hydration. */}
      <Suspense fallback={<CatalogPlaceholder />}>
        <Catalog products={products} sizesInStock={sizesInStock()} />
      </Suspense>
    </>
  );
}

/**
 * The shelf before it is a shelf.
 *
 * Not skeleton cards — no fake headline bars, no fake price, and nothing
 * pulsing. It is the grid's own rhythm held open: the same three columns, the
 * same 4:3 image area, the same wave under each one, in the faintest wash of
 * espresso the palette allows. What arrives on top of it lands in exactly the
 * space it was already occupying, so there is no shift to see.
 */
function CatalogPlaceholder() {
  return (
    <section>
      <div className="max-w-page mx-auto px-5 md:px-8">
        <div className="py-3">
          <p className="font-mono text-utility text-muted py-2 uppercase">Loading the shelf</p>
        </div>
        <Wave />
      </div>

      <div aria-hidden="true" className="max-w-page mx-auto px-5 pt-12 md:px-8 md:pt-20">
        <div className="grid grid-cols-2 items-start gap-x-6 gap-y-14 md:grid-cols-3 md:gap-x-12 md:gap-y-24">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <div className="bg-espresso/5 aspect-4/3" />
              <Wave className="-mx-3 h-2 md:-mx-5" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
