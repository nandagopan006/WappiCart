import Link from "next/link";

import { AudienceGrid, type AudienceEntry } from "@/components/audience-grid";
import { BrandStatement } from "@/components/brand-statement";
import { CategoryStory } from "@/components/category-story";
import { CollectionSpread } from "@/components/collection-spread";
import { HomeHero } from "@/components/home-hero";
import { Magnetic } from "@/components/magnetic";
import { ProductGrid } from "@/components/product-grid";
import { ProductStory } from "@/components/product-story";
import { ProximityText } from "@/components/proximity-text";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "@/components/section-heading";
import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import {
  countByCategory,
  featuredProducts,
  previewByCategory,
  publishedProducts,
  type Category,
  type Product,
} from "@/lib/products";
import { getShelves } from "@/lib/repositories/categories";
import {
  categoryStoryConfigOf,
  collectionSpreadConfigOf,
  getHomepageLayout,
  type HomepageSection,
} from "@/lib/repositories/homepage";
import { getShop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * The shop, told as a sequence rather than stacked as blocks.
 *
 * ── The order lives in the database now ──────────────────────────────────
 * This used to be a fixed run of JSX. It is now driven by `homepage_sections`,
 * so the shop's owner can reorder the page, turn a section off, retitle it and
 * choose which pairs it shows — without a deployment.
 *
 * What did NOT become editable is the design. Each section still renders the
 * component it always did, with the layout, type and spacing that component
 * owns. The editor picks *what* appears and *in what order*; it cannot pick a
 * colour or a column count, and that restriction is the point.
 *
 * ── The numeral is the position ──────────────────────────────────────────
 * A section's number is its place in the enabled run, computed here rather
 * than stored. Turning a section off renumbers the rest instead of leaving a
 * gap where 04 used to be.
 *
 * ── Pinned pairs, or the query that was always there ─────────────────────
 * A section with no explicit selection falls back to how it behaved before
 * any of this existed. `resolve()` below is where that happens, and it is why
 * an untouched database renders exactly the page this file used to hardcode.
 */

/**
 * A category's lead pair and the two behind it. Falls back to the front of the
 * shelf so a change in the catalogue can never leave a section holding nothing.
 */
function shelf(category: Category, previews: Record<Category, Product[]>, catalogue: Product[]) {
  const all = previews[category] ?? [];
  const lead = all.find((p) => p.featured) ?? all[0] ?? catalogue[0];
  return { lead, support: all.filter((p) => p.slug !== lead?.slug).slice(0, 2) };
}

export default async function HomePage() {
  /* One catalogue read behind all of these — every helper is deduped per
     render, so these cost a single query. Sequential rather than parallel:
     the transaction pooler resets a connection asked to pipeline. */
  const catalogue = await publishedProducts();
  const shelves = await getShelves();
  const counts = await countByCategory();
  const previews = await previewByCategory(Number.MAX_SAFE_INTEGER);
  const featured = await featuredProducts();
  const layout = await getHomepageLayout();
  const shop = await getShop();

  const bySlug = new Map(catalogue.map((p) => [p.slug, p] as const));
  /* A shelf's name and blurb now come from its row rather than from a constant
     in this file, so renaming one in the admin renames it on the home page. */
  const shelfBySlug = new Map(shelves.map((s) => [s.slug, s] as const));
  const pairCount = catalogue.reduce((total, p) => total + p.sizes.length, 0);

  /**
   * The pairs a section shows.
   *
   * Pinned slugs first, filtered to what is actually published — an archived
   * pair drops out rather than rendering a hole. When nothing survives, the
   * section's original query fills in.
   */
  const resolve = (section: HomepageSection, fallback: Product[]): Product[] => {
    const pinned = section.productSlugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is Product => Boolean(p));

    const chosen = pinned.length > 0 ? pinned : fallback;
    return section.itemLimit ? chosen.slice(0, section.itemLimit) : chosen;
  };

  /* The pairs the editorial sections have already spent, so the collection
     spread does not show a shoe that is already three sections above it. */
  const spent = new Set<string>();

  /* An empty catalogue is a database that has not been seeded yet, not a shop
     with no shoes. Rendering the editorial sections around nothing would
     produce a page of headings with holes in it. */
  if (catalogue.length === 0) return <EmptyShop />;

  /* The hero is unnumbered; every other enabled section counts up from 01. */
  let numeral = 0;

  const rendered = layout.map((section) => {
    const index = section.type === "hero" ? 0 : (numeral += 1);

    switch (section.type) {
      case "hero": {
        const [pair] = resolve(section, featured.length > 0 ? featured : catalogue);
        if (!pair) return null;
        spent.add(pair.slug);
        return (
          <HomeHero
            key={section.id}
            product={pair}
            styleCount={catalogue.length}
            pairCount={pairCount}
          />
        );
      }

      case "new_in": {
        const arrivals = resolve(section, catalogue.filter((p) => p.isNew).length > 0 ? catalogue.filter((p) => p.isNew) : catalogue);
        if (arrivals.length === 0) return null;
        return (
          /* Stock, immediately. An editorial page that makes a shopper scroll
             past two full screens before showing a price is a lookbook. */
          <section key={section.id} className="max-w-page mx-auto px-4 pt-section md:px-8">
            <SectionHeading index={index} meta={`${arrivals.length} styles`}>
              {section.title ?? "New in"}
            </SectionHeading>
            <ProductGrid products={arrivals} className="mt-8" priorityCount={0} />
          </section>
        );
      }

      case "category_story": {
        /* The fallback is whichever shelf is first rather than a hardcoded
           "sneakers": that shelf can be renamed, hidden or deleted now. */
        const config = categoryStoryConfigOf(section, shelves[0]?.slug ?? "");
        /* A story pointing at a shelf that has since been hidden or deleted
           falls back to the first one rather than rendering an empty section. */
        const row = shelfBySlug.get(config.category) ?? shelves[0];
        if (!row) return null;

        const picked = shelf(row.slug, previews, catalogue);
        const [lead] = resolve(section, picked.lead ? [picked.lead] : []);
        if (!lead) return null;
        spent.add(lead.slug);

        const support = picked.support.filter((p) => p.slug !== lead.slug).slice(0, 2);

        return (
          <CategoryStory
            key={section.id}
            index={index}
            category={row.slug}
            label={row.name}
            lead={lead}
            support={support}
            count={counts[row.slug] ?? 0}
            blurb={config.blurb || row.description}
            side={config.side}
          />
        );
      }

      case "product_story": {
        const fallback = catalogue.filter((p) => !spent.has(p.slug));
        /* Deliberately not the hero's pair, or the page shows the same
           photograph twice inside one scroll. */
        const [pair] = resolve(section, fallback.length > 0 ? fallback : catalogue);
        if (!pair) return null;
        spent.add(pair.slug);
        return <ProductStory key={section.id} index={index} product={pair} />;
      }

      case "collection_spread": {
        const config = collectionSpreadConfigOf(section);
        const spread = resolve(
          section,
          catalogue.filter((p) => !spent.has(p.slug)),
        ).slice(0, 3);
        if (spread.length === 0) return null;
        for (const p of spread) spent.add(p.slug);

        return (
          <CollectionSpread
            key={section.id}
            index={index}
            products={spread}
            eyebrow={config.eyebrow || "The rest of the shelf"}
            headline={
              config.headline ||
              "Small runs from makers we have met, photographed in the room they ship from."
            }
          />
        );
      }

      case "category_tiles": {
        const tiles: AudienceEntry[] = shelves
          .map((row) => ({
            category: row.slug,
            label: row.name,
            count: counts[row.slug] ?? 0,
            /* The shelf's own photograph when the admin has set one, and its
               lead pair's when they have not. */
            image: row.imageUrl ?? shelf(row.slug, previews, catalogue).lead?.image ?? "",
          }))
          .filter((entry) => Boolean(entry.image));

        if (tiles.length === 0) return null;

        return (
          <div key={section.id}>
            <div className="max-w-page mx-auto px-4 pt-section pb-8 md:px-8">
              <SectionHeading index={index} meta={`${tiles.length} shelves`}>
                {section.title ?? "Shop by shelf"}
              </SectionHeading>
            </div>
            <AudienceGrid entries={tiles} />
          </div>
        );
      }

      case "brand_statement":
        return <BrandStatement key={section.id} index={index} />;

      case "order_block":
        return (
          /* No email field. The shop's list is its chat thread — a newsletter
             signup here would be a form that submits nowhere. */
          <section key={section.id} className="max-w-page mx-auto px-4 py-section md:px-8">
            <ScrollReveal>
              <p className="text-caption text-grey flex items-baseline gap-4 uppercase">
                <span aria-hidden="true" className="tabular-nums">
                  {String(index).padStart(2, "0")}
                </span>
                <span>No cart. No checkout.</span>
              </p>

              <ProximityText as="h2" className="text-display text-ink mt-8 font-light uppercase">
                {section.title ?? "Order in a message"}
              </ProximityText>

              <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-12">
                <p className="text-lead text-grey md:col-span-5">
                  Send us the pair and your size. We confirm the fit and the payment in the same
                  chat. {shop.replyTime}
                </p>

                <div className="md:col-span-6 md:col-start-7">
                  <Magnetic strength={10}>
                    <a
                      href={buildChatLink(shop)}
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
        );

      default:
        return null;
    }
  });

  /* A layout with nothing in it — every section disabled, or a database that
     has not been seeded — still has to be a shop. */
  if (rendered.every((node) => node === null)) return <EmptyShop />;

  return <>{rendered}</>;
}

/**
 * Shown when the catalogue is empty — a fresh database before `npm run
 * db:seed`, or every pair archived at once. It says what is true and points
 * at the fix rather than rendering a shop with no shoes in it.
 */
function EmptyShop() {
  return (
    <section className="max-w-page mx-auto px-4 py-section text-center md:px-8">
      <h1 className="text-title text-ink uppercase">Nothing on the shelf yet</h1>
      <p className="text-body text-grey mx-auto mt-4 max-w-prose">
        The catalogue is empty. Add the first pair in the admin, or run{" "}
        <code className="text-ink">npm run db:seed</code> to migrate the starting twelve.
      </p>
      <p className="text-caption text-grey mt-8 uppercase">
        <Link href="/shop" className="link-quiet text-ink">
          See the shelf
        </Link>
      </p>
    </section>
  );
}
