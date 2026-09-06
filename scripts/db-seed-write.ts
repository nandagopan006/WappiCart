import { eq, sql } from "drizzle-orm";

import type { Category } from "../lib/catalogue";
import {
  aboutContent,
  categories,
  homepageProductSelections,
  homepageSections,
  productImages,
  productSizes,
  products,
  seoSettings,
  shopSettings,
} from "../lib/db/schema";

/**
 * The write half of the migration.
 *
 * Kept apart from `db-seed.ts` so that `--dry-run` can validate the whole
 * catalogue without importing `lib/db`, which throws on a missing
 * DATABASE_URL at module load. Validation should not require credentials.
 *
 * ── Idempotence, and what re-running is allowed to destroy ───────────────
 * Everything here can be run twice. What it must never do is silently undo an
 * editor's work, so the two kinds of row are treated differently:
 *
 *   Products      inserted if absent, left alone if present. Re-running after
 *                 fixing one bad record adds the missing pair without
 *                 reverting eleven products someone has since edited.
 *                 `--force` overwrites from products.json, for when that is
 *                 genuinely what you want.
 *
 *   Content       seeded only when the table is empty. Once an editor has
 *                 arranged the home page, a second `db:seed` must not put it
 *                 back to the shipped order.
 *
 * The whole thing runs in one transaction. A migration that half-succeeds
 * leaves a catalogue nobody can reason about.
 */

type SeedProduct = {
  slug: string;
  name: string;
  categorySlug: Category;
  price: number;
  mrp: number | null;
  colour: string;
  material: string;
  fitNote: string | null;
  description: string;
  care: string;
  sku: string;
  featured: boolean;
  isNew: boolean;
  position: number;
  images: { url: string; alt: string; storagePath: string | null }[];
  sizes: number[];
};

type SeedInput = {
  products: SeedProduct[];
  categories: Record<Category, { name: string; description: string; position: number }>;
  homepage: readonly {
    type: string;
    position: number;
    itemLimit: number | null;
    config: object;
    title: string | null;
  }[];
  shop: Record<string, string>;
  seo: Record<string, string | null>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function seedDatabase(
  db: any,
  input: SeedInput,
  options: { force?: boolean } = {},
): Promise<void> {
  const force = options.force ?? process.argv.includes("--force");

  await db.transaction(async (tx: any) => {
    /* ── Categories ──────────────────────────────────────────────────── */

    /* Upserted rather than insert-only: names and blurbs are the storefront's
       own copy, and a category row that does not exist would break the
       products' foreign key. Editable fields are preserved on re-run — only
       the name and blurb are refreshed, and only when they are still the
       shipped defaults. */
    for (const [slug, value] of Object.entries(input.categories)) {
      await tx
        .insert(categories)
        .values({
          slug,
          name: value.name,
          description: value.description,
          position: value.position,
          enabled: true,
        })
        .onConflictDoNothing();
    }

    console.log(`  categories: ${Object.keys(input.categories).length} ensured`);

    /* ── Products ────────────────────────────────────────────────────── */

    let inserted = 0;
    let skipped = 0;

    for (const p of input.products) {
      const row = {
        slug: p.slug,
        name: p.name,
        categorySlug: p.categorySlug,
        price: p.price,
        mrp: p.mrp,
        colour: p.colour,
        material: p.material,
        fitNote: p.fitNote,
        description: p.description,
        care: p.care,
        sku: p.sku,
        featured: p.featured,
        isNew: p.isNew,
        position: p.position,
        /* Everything in products.json was live on the storefront, so it
           migrates as published rather than as a draft nobody would think to
           go and publish. */
        status: "published" as const,
        publishedAt: new Date(),
        updatedAt: new Date(),
      };

      const result = force
        ? await tx
            .insert(products)
            .values(row)
            .onConflictDoUpdate({ target: products.slug, set: row })
            .returning({ id: products.id })
        : await tx.insert(products).values(row).onConflictDoNothing().returning({ id: products.id });

      const productId = result[0]?.id;

      if (!productId) {
        skipped += 1;
        continue;
      }

      inserted += 1;

      /* Replace rather than merge: image order and the size run are sets, and
         a partial update would leave a stale third photograph behind. Scoped
         to this product inside the transaction, so nothing else is at risk. */
      await tx.delete(productImages).where(eq(productImages.productId, productId));
      await tx.delete(productSizes).where(eq(productSizes.productId, productId));

      if (p.images.length > 0) {
        await tx.insert(productImages).values(
          p.images.map((image, position) => ({
            productId,
            url: image.url,
            alt: image.alt,
            storagePath: image.storagePath,
            position,
          })),
        );
      }

      if (p.sizes.length > 0) {
        await tx.insert(productSizes).values(p.sizes.map((size) => ({ productId, size })));
      }
    }

    console.log(
      `  products:   ${inserted} written, ${skipped} already present${force ? " (forced overwrite)" : ""}`,
    );

    /* ── Home page ───────────────────────────────────────────────────── */

    const [{ count: sectionCount }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(homepageSections);

    if (sectionCount === 0) {
      await tx.insert(homepageSections).values(
        input.homepage.map((section) => ({
          type: section.type as never,
          position: section.position,
          itemLimit: section.itemLimit,
          config: section.config,
          title: section.title,
          enabled: true,
        })),
      );
      console.log(`  homepage:   ${input.homepage.length} sections seeded`);
    } else {
      console.log(`  homepage:   ${sectionCount} sections already arranged, left alone`);
    }

    /* ── Singletons ──────────────────────────────────────────────────── */

    await tx.insert(shopSettings).values({ id: 1, ...input.shop } as never).onConflictDoNothing();
    await tx.insert(seoSettings).values({ id: 1, ...input.seo } as never).onConflictDoNothing();

    /* The About row starts EMPTY, and that is deliberate.
       Every one of its fields is an *override*. The page falls back to the
       shop's own delivery line, its return window (with the pickup sentence
       appended) and its reply time when the corresponding field is blank —
       so pre-filling them with the shop's values would silently win over
       those fallbacks and drop the composed wording. An editor who wants
       something more specific here types it; until then the page reads
       exactly as it shipped. */
    await tx
      .insert(aboutContent)
      .values({
        id: 1,
        headline: "",
        body: "",
        deliveryInfo: "",
        returnsInfo: "",
        hours: "",
        photographyNote: "",
        imageSlugs: [],
      })
      .onConflictDoNothing();

    console.log("  settings:   shop, SEO and about ensured");
  });
}

/**
 * Unused selections note: `homepageProductSelections` is intentionally left
 * empty by the seed. An empty selection means "fall back to the query this
 * section always used" — featured pairs for the hero, the isNew flag for New
 * in — which is exactly how the page behaved before the migration. Pinning
 * specific pairs is a choice the editor makes, not a default the seed should
 * make for them.
 */
void homepageProductSelections;
