import type { Metadata } from "next";

import { Catalog } from "@/components/catalog";
import { SectionHeading } from "@/components/section-heading";
import { publishedProducts, sizesInStock } from "@/lib/products";
import { getShelves } from "@/lib/repositories/categories";
import { getShop } from "@/lib/shop";

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
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  /* One catalogue read shared by both — `publishedProducts` is deduped per
     render, so `sizesInStock` costs nothing extra.

     Awaited in sequence rather than with Promise.all: postgres.js pipelines
     concurrent queries down one pooled connection and Supabase's transaction
     pooler resets it rather than queueing. */
  const products = await publishedProducts();
  const sizes = await sizesInStock();
  const shelves = await getShelves();
  const shop = await getShop();

  /* The shelf `?c=` asks for, checked against the shelves that actually exist.
     An unknown value falls back to showing everything — a mistyped or stale
     link should never present an empty shop. */
  const params = await searchParams;
  const requested = Array.isArray(params.c) ? params.c[0] : params.c;
  const initialCategory = shelves.find((s) => s.slug === requested)?.slug ?? null;

  return (
    <div className="pt-10 md:pt-14">
      <div className="max-w-page mx-auto px-4 md:px-8">
        <SectionHeading as="h1">All shoes</SectionHeading>
      </div>

      {/* Rendered on the server, filter and all.
          This used to sit behind a Suspense boundary because Catalog read the
          URL itself, and a component that reads the URL cannot be prerendered
          — so the shop page shipped as a placeholder and filled in only after
          JavaScript ran. That left it empty for search engines and for anyone
          with JavaScript off, which the design system does not allow.
          Reading `?c=` here instead makes the route dynamic, which costs one
          cached database read and gives back a shop page with shoes in it. */}
      <Catalog
        products={products}
        shelves={shelves}
        sizesInStock={sizes}
        shop={shop}
        initialCategory={initialCategory}
      />
    </div>
  );
}

