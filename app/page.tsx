import Link from "next/link";

import { AudienceGrid, type AudienceEntry } from "@/components/audience-grid";
import { BrandStatement } from "@/components/brand-statement";
import { CategoryStory } from "@/components/category-story";
import { CollectionSpread } from "@/components/collection-spread";
import { HomeHero } from "@/components/home-hero";
import { Magnetic } from "@/components/magnetic";
import { ProductGrid } from "@/components/product-grid";
import { ProductStory } from "@/components/product-story";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "@/components/section-heading";
import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import {
  CATEGORIES,
  countByCategory,
  featuredProducts,
  getProduct,
  newProducts,
  previewByCategory,
  products,
  type Category,
  type Product,
} from "@/lib/products";
import { shop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * The shop, told as a sequence rather than stacked as blocks.
 *
 *   HERO            one pair at campaign size
 *   NEW IN          four arrivals, plain grid — the page earns its editorial
 *                   sections by putting stock on screen first
 *   SNEAKERS        category story, photograph left
 *   PRODUCT         one pair, full width, the pause
 *   LOAFERS         category story, photograph right — never the same shape twice
 *   SPREAD          three pairs in an editorial composition
 *   SHELVES         four full-bleed category tiles, edge to edge
 *   STATEMENT       display type, no product
 *   EVERYTHING      all twelve, because the home page is the catalogue
 *   ORDER           the only thing the site has been asking for
 *
 * Every product shown is a real link to a real product page, and every
 * category name links to that shelf pre-filtered. Nothing here is decorative
 * imagery with no destination.
 */

/** Category blurbs. One sentence, what the shoe is, no adjectives for sale. */
const BLURB: Record<Category, string> = {
  sneakers: "Flat rubber, low profile, canvas or leather. The pairs that get worn until the sole goes.",
  formals: "Goodyear-welted leather with a closed lacing. Stiff for a fortnight, then yours.",
  loafers: "No laces, full-grain uppers. For days that start at a desk and end somewhere else.",
  sandals: "Open leather and a flat footbed. Kerala weather, most of the year.",
};

/**
 * A category's lead pair and the two behind it. Falls back to the front of the
 * shelf so a change in products.json can never leave a section holding nothing.
 */
function shelf(category: Category, previews: Record<Category, Product[]>) {
  const all = previews[category] ?? [];
  const lead = all.find((p) => p.featured) ?? all[0] ?? products[0];
  return { lead, support: all.filter((p) => p.slug !== lead.slug).slice(0, 2) };
}

export default function HomePage() {
  const counts = countByCategory();
  const previews = previewByCategory(Number.MAX_SAFE_INTEGER);
  const featured = featuredProducts();

  const heroPair = featured[0] ?? products[0];
  const arrivals = newProducts(4);
  const sneakers = shelf("sneakers", previews);
  const loafers = shelf("loafers", previews);

  /* The pair the product story is built on — deliberately not the hero's, or
     the page shows the same photograph twice inside one scroll. */
  const storyPair = getProduct("brogue-wing-chestnut") ?? featured[1] ?? products[1];

  /* Three pairs for the spread, none of them already carrying a section. */
  const spent = new Set([heroPair.slug, storyPair.slug, sneakers.lead.slug, loafers.lead.slug]);
  const spread = products.filter((p) => !spent.has(p.slug)).slice(0, 3);

  const shelves: AudienceEntry[] = CATEGORIES.map((category) => ({
    category,
    count: counts[category],
    product: shelf(category, previews).lead,
  }));

  return (
    <>
      <HomeHero product={heroPair} />

      {/* Stock, immediately. An editorial page that makes a shopper scroll
          past two full screens before showing a price is a lookbook. */}
      <section className="max-w-page mx-auto px-4 pt-section md:px-8">
        <SectionHeading index={1} meta={`${arrivals.length} styles`}>
          New in
        </SectionHeading>
        <ProductGrid products={arrivals} className="mt-8" priorityCount={0} />
      </section>

      <CategoryStory
        index={2}
        category="sneakers"
        lead={sneakers.lead}
        support={sneakers.support}
        count={counts.sneakers}
        blurb={BLURB.sneakers}
        side="left"
      />

      <ProductStory index={3} product={storyPair} />

      <CategoryStory
        index={4}
        category="loafers"
        lead={loafers.lead}
        support={loafers.support}
        count={counts.loafers}
        blurb={BLURB.loafers}
        side="right"
      />

      <CollectionSpread
        index={5}
        products={spread}
        eyebrow="The rest of the shelf"
        headline="Small runs from makers we have met, photographed in the room they ship from."
      />

      <div className="max-w-page mx-auto px-4 pt-section pb-8 md:px-8">
        <SectionHeading index={6} meta={`${CATEGORIES.length} shelves`}>
          Shop by shelf
        </SectionHeading>
      </div>
      <AudienceGrid entries={shelves} />

      <BrandStatement index={7} />

      {/* The catalogue. Every pair, in one grid, because the home page is the
          shop and not a window onto it. */}
      <section className="max-w-page mx-auto px-4 pt-section md:px-8">
        <SectionHeading index={8} meta={`${products.length} styles`}>
          Everything in stock
        </SectionHeading>
        <ProductGrid products={products} className="mt-8" priorityCount={0} />

        <p className="text-caption text-grey border-line mt-12 border-t pt-6 uppercase">
          <Link href="/shop" className="link-quiet text-ink">
            Filter by size and price →
          </Link>
        </p>
      </section>

      {/* No email field. The shop's list is its chat thread — a newsletter
          signup here would be a form that submits nowhere. */}
      <section className="max-w-page mx-auto px-4 py-section md:px-8">
        <ScrollReveal>
          <p className="text-caption text-grey flex items-baseline gap-4 uppercase">
            <span aria-hidden="true" className="tabular-nums">
              09
            </span>
            <span>No cart. No checkout.</span>
          </p>

          <p className="text-display text-ink mt-8 font-light uppercase">Order in a message</p>

          <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-12">
            <p className="text-lead text-grey md:col-span-5">
              Send us the pair and your size. We confirm the fit and the payment in the same chat.{" "}
              {shop.replyTime}
            </p>

            <div className="md:col-span-6 md:col-start-7">
              <Magnetic strength={10}>
                <a
                  href={buildChatLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption border-ink bg-ink text-paper hover:bg-paper hover:text-ink inline-flex h-13 items-center gap-2 border px-10 uppercase transition-colors"
                >
                  <WhatsappGlyph className="text-whatsapp" />
                  Message the shop
                </a>
              </Magnetic>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
