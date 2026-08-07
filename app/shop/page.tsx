import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalog } from "@/components/catalog";
import { Wave } from "@/components/wave";
import { pairsInStock, products, sizesInStock } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every pair on the shelf. Filter by category and size, then order the one you want on WhatsApp.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <>
      <header className="max-w-page mx-auto px-5 pt-10 pb-8 md:px-8 md:pt-16">
        <h1 className="type-display text-display">Every pair</h1>
        <p className="font-mono text-utility text-muted mt-4 uppercase">
          {products.length} styles · {pairsInStock()} pairs in stock
        </p>
      </header>

      <div className="max-w-page mx-auto px-5 md:px-8">
        <Wave />
      </div>

      {/* Catalog reads ?c= to pick up the category the homepage sent it.
          Without this boundary that hook would drag the whole route out of
          static rendering and into client-side rendering at build time. */}
      <Suspense>
        <Catalog products={products} sizesInStock={sizesInStock()} />
      </Suspense>
    </>
  );
}
