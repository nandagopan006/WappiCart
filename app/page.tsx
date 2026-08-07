import { CategoryBand } from "@/components/category-band";
import { EditorialBanner } from "@/components/editorial-banner";
import { FeaturedPairs } from "@/components/featured-pairs";
import { Hero } from "@/components/hero";
import { ServiceStrip } from "@/components/service-strip";
import { featuredProducts } from "@/lib/products";

/**
 * A shopfront window, not the catalogue.
 *
 * Hero, three pairs, four shelves, one banner, four facts. The featured grid
 * never shows more than three products — the page's job is to make someone tap
 * through to /shop, not to be /shop.
 */
export default function HomePage() {
  const featured = featuredProducts();

  return (
    <>
      {/* The hero photograph is the first featured pair, so the shopfront
          window and the shoe leading it can never disagree. */}
      <Hero featured={featured[0]} />
      <FeaturedPairs />
      <CategoryBand />
      <EditorialBanner product={featured[1]} />
      <ServiceStrip />
    </>
  );
}
