import Link from "next/link";

import { BannerStrip } from "@/components/banner-strip";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { featuredProducts, newProducts, products } from "@/lib/products";

/**
 * The shop, on one page.
 *
 * A retail catalogue does not open on a hero — it opens on stock. New arrivals
 * first, then the whole shelf, with a pale band between them so a long run of
 * tiles reads as two chapters instead of one wall.
 *
 * Everything the shop sells is on this page. /shop is the same stock with
 * filters attached, for someone who already knows what they are after.
 */
export default function HomePage() {
  const featured = featuredProducts();
  const arrivals = newProducts(4);

  return (
    <div className="max-w-page mx-auto">
      <section className="px-4 pt-10 md:px-8 md:pt-14">
        <SectionHeading as="h1">New in</SectionHeading>
        <ProductGrid products={arrivals} className="mt-10" priorityCount={4} />
      </section>

      <BannerStrip
        left={featured[0] ?? products[0]}
        right={featured[1] ?? products[1]}
        headline="Every pair ships from Kerala in 2 days."
        href="/shop"
        cta="See the shelf"
      />

      <section className="px-4 pt-2 pb-section md:px-8">
        <SectionHeading className="pt-10">Best selling</SectionHeading>
        <ProductGrid products={products} className="mt-10" priorityCount={0} />

        <p className="text-body text-grey mt-12 text-center">
          {products.length} styles on the shelf.{" "}
          <Link href="/shop" className="link-quiet text-ink">
            Filter by size and price
          </Link>
        </p>
      </section>
    </div>
  );
}
