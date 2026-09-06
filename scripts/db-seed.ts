/**
 * Migrate `data/products.json` — and the values that were hardcoded in the
 * storefront — into Postgres.
 *
 * ── Safety ───────────────────────────────────────────────────────────────
 * Nothing here deletes. Every write is an upsert keyed on the natural
 * identity a row already had (a product's slug, a category's slug, the
 * singleton id 1), so running this twice produces the same database rather
 * than a second copy of the catalogue. That is what makes it safe to re-run
 * after fixing one bad record.
 *
 * Every product is validated against the real publish contract BEFORE any
 * write happens. If one product fails, nothing is written — a half-migrated
 * catalogue is worse than an unmigrated one, because you cannot tell by
 * looking which half is which.
 *
 *   npm run db:seed -- --dry-run    validate and report, touch nothing
 *   npm run db:seed                 validate, then write
 *
 * `--dry-run` needs no database and no credentials, which is the mode to run
 * first.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Category } from "../lib/catalogue";
import { productPublishableSchema, toFieldErrors } from "../lib/validation/product";

const DRY_RUN = process.argv.includes("--dry-run");

/* ── What the JSON on disk looks like ───────────────────────────────────── */

type LegacyProduct = {
  slug: string;
  name: string;
  category: string;
  price: number;
  mrp?: number;
  images: string[];
  alt: string;
  sizes: number[];
  colour: string;
  material: string;
  fitNote?: string;
  description: string;
  care: string;
  sku: string;
  featured?: boolean;
  isNew?: boolean;
};

/* ── The values that were hardcoded in the storefront ───────────────────── */

/**
 * The shelves the shop starts with, and their blurbs, lifted verbatim out of
 * `app/page.tsx`.
 *
 * They were a `BLURB` const in the page file. Moving them here rather than
 * inventing new copy is the whole point: after the migration the home page
 * has to read exactly as it did before, or the migration changed the shop
 * without anyone deciding to.
 *
 * This is a *starting* set, not the shop's definition of a shelf — shelves are
 * rows the admin creates and deletes. It is the only list of them left in the
 * codebase, and nothing outside this script may read it.
 */
const CATEGORY_SEED: Record<Category, { name: string; description: string; position: number }> = {
  sneakers: {
    name: "Sneakers",
    description:
      "Flat rubber, low profile, canvas or leather. The pairs that get worn until the sole goes.",
    position: 0,
  },
  formals: {
    name: "Formals",
    description: "Goodyear-welted leather with a closed lacing. Stiff for a fortnight, then yours.",
    position: 1,
  },
  loafers: {
    name: "Loafers",
    description:
      "No laces, full-grain uppers. For days that start at a desk and end somewhere else.",
    position: 2,
  },
  sandals: {
    name: "Sandals",
    description: "Open leather and a flat footbed. Kerala weather, most of the year.",
    position: 3,
  },
};

/**
 * The home page as it stands today, section for section.
 *
 * `position` is both the order and the numeral the section shows. This is the
 * sequence currently written into `app/page.tsx`, so the first render after
 * the migration is byte-for-byte the page that was there before.
 */
const HOMEPAGE_SEED = [
  { type: "hero", position: 0, itemLimit: 1, config: {}, title: null },
  { type: "new_in", position: 1, itemLimit: 4, config: {}, title: "New in" },
  {
    type: "category_story",
    position: 2,
    itemLimit: 3,
    config: { category: "sneakers", blurb: CATEGORY_SEED.sneakers.description, side: "left" },
    title: null,
  },
  { type: "product_story", position: 3, itemLimit: 1, config: {}, title: null },
  {
    type: "category_story",
    position: 4,
    itemLimit: 3,
    config: { category: "loafers", blurb: CATEGORY_SEED.loafers.description, side: "right" },
    title: null,
  },
  {
    type: "collection_spread",
    position: 5,
    itemLimit: 3,
    config: {
      eyebrow: "The rest of the shelf",
      headline:
        "Small runs from makers we have met, photographed in the room they ship from.",
    },
    title: null,
  },
  { type: "category_tiles", position: 6, itemLimit: null, config: {}, title: "Shop by shelf" },
  { type: "brand_statement", position: 7, itemLimit: null, config: {}, title: null },
  { type: "order_block", position: 8, itemLimit: null, config: {}, title: "Order in a message" },
] as const;

/**
 * Lifted from `lib/shop.ts`, which stops being the source of truth after this.
 *
 * A function rather than a const because it reads the environment, and
 * `.env.local` is not loaded until `main()` calls `loadEnv()` — a module-level
 * object would capture the placeholder phone number instead of the real one.
 */
const shopSeed = () => ({
  name: "WappiCart",
  tagline: "Shoes that arrive in a conversation.",
  whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "919000000000",
  instagram: "https://instagram.com/wappicart",
  instagramHandle: "@wappicart",
  deliveryAreas: "Kochi, Thrissur and Kozhikode in 2 days. Rest of India in 4–6.",
  returnWindow: "7 days, unworn, box intact.",
  replyTime: "We reply in about an hour, 9am to 9pm.",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wappicart.vercel.app").replace(/\/$/, ""),
});

/** Lifted from the metadata block in `app/layout.tsx`. */
const seoSeed = (shop: ReturnType<typeof shopSeed>) => ({
  siteTitle: `${shop.name} — ${shop.tagline}`,
  metaDescription:
    "A small shoe shop. Browse the pairs here, order the one you want on WhatsApp. No cart, no checkout form, no account.",
  ogTitle: `${shop.name} — ${shop.tagline}`,
  ogDescription: "Browse the pairs here, order on WhatsApp.",
  ogImageUrl: null,
});

/* ── Mapping one legacy product onto the new shape ──────────────────────── */

/**
 * The one genuine shape change in the whole migration.
 *
 * `products.json` carried a single `alt` for the product; the new schema puts
 * alt text on each image, because that is what a screen reader actually needs
 * when it reaches the third photograph. There is no honest way to invent
 * three distinct descriptions from one, so every view inherits the product's
 * alt verbatim — accurate, since they are views of the same shoe, and true to
 * what the old data said. Refining them per view is an editing job for the
 * admin, and the migration reports how many are waiting.
 */
function toProductInput(p: LegacyProduct, position: number) {
  return {
    slug: p.slug,
    name: p.name,
    categorySlug: p.category as Category,
    price: p.price,
    mrp: p.mrp ?? null,
    colour: p.colour,
    material: p.material,
    fitNote: p.fitNote ?? null,
    description: p.description,
    care: p.care,
    sku: p.sku,
    featured: p.featured ?? false,
    isNew: p.isNew ?? false,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    position,
    images: p.images.map((url) => ({ url, alt: p.alt, storagePath: null })),
    sizes: p.sizes,
  };
}

/* ── Run ────────────────────────────────────────────────────────────────── */

async function main() {
  const path = resolve(process.cwd(), "data/products.json");
  const legacy = JSON.parse(readFileSync(path, "utf8")) as LegacyProduct[];

  console.log(`\nRead ${legacy.length} products from data/products.json\n`);

  /* ── 1. Validate everything before writing anything ─────────────────── */

  const valid: ReturnType<typeof toProductInput>[] = [];
  const failures: { slug: string; errors: Record<string, string> }[] = [];

  const slugs = new Set<string>();
  const skus = new Set<string>();
  const duplicates: string[] = [];

  legacy.forEach((p, index) => {
    const input = toProductInput(p, index);
    const parsed = productPublishableSchema.safeParse(input);

    if (!parsed.success) {
      failures.push({ slug: p.slug || `(row ${index})`, errors: toFieldErrors(parsed.error) });
      return;
    }

    /* Uniqueness cannot be a schema rule — it needs the whole set. The
       database enforces it too, but catching it here names the offender
       instead of surfacing a constraint violation. */
    if (slugs.has(p.slug)) duplicates.push(`duplicate slug "${p.slug}"`);
    if (skus.has(p.sku)) duplicates.push(`duplicate SKU "${p.sku}"`);
    slugs.add(p.slug);
    skus.add(p.sku);

    valid.push(input);
  });

  /* Every product must land on a shelf this script is about to create — a
     product row pointing at a missing shelf is rejected by the foreign key,
     and finding that out mid-write is worse than finding it out here. */
  const seeded = Object.keys(CATEGORY_SEED);
  for (const category of new Set(legacy.map((p) => p.category))) {
    if (!seeded.includes(category)) {
      duplicates.push(`unknown category "${category}"`);
    }
  }

  if (failures.length > 0 || duplicates.length > 0) {
    console.error("Migration aborted. Nothing was written.\n");

    for (const f of failures) {
      console.error(`  ${f.slug}`);
      for (const [field, message] of Object.entries(f.errors)) {
        console.error(`      ${field}: ${message}`);
      }
    }
    for (const d of duplicates) console.error(`  ${d}`);

    console.error(
      `\n${failures.length} product(s) failed validation, ${duplicates.length} catalogue-level problem(s).`,
    );
    console.error("Fix data/products.json and run again. No data has been discarded.\n");
    process.exit(1);
  }

  const imageCount = valid.reduce((n, p) => n + p.images.length, 0);
  const sizeCount = valid.reduce((n, p) => n + p.sizes.length, 0);

  console.log(`  ${valid.length} products valid against the publish contract`);
  console.log(`  ${imageCount} images`);
  console.log(`  ${sizeCount} size rows (= ${sizeCount} orderable pairs)`);
  console.log(`  ${valid.filter((p) => p.featured).length} featured, ${valid.filter((p) => p.isNew).length} new`);
  console.log(
    `  ${Object.keys(CATEGORY_SEED).length} categories, ${HOMEPAGE_SEED.length} home page sections`,
  );
  console.log(`\n  Note: ${imageCount} image(s) inherited the product's single alt text.`);
  console.log("        Refine them per view in the admin when you get a chance.\n");

  if (DRY_RUN) {
    console.log("Dry run — nothing was written.\n");
    return;
  }

  /* ── 2. Write, in one transaction ───────────────────────────────────── */

  /* Imported here rather than at the top of the file so `--dry-run` needs no
     DATABASE_URL at all — a validation pass should not require credentials.
     `scripts/db-connect` rather than `lib/db`, because the app's handle is
     marked `server-only` and that marker throws outside Next's server build. */
  const { connect } = await import("./db-connect");
  const { seedDatabase } = await import("./db-seed-write");

  const { db, close } = connect();
  const shop = shopSeed();

  try {
    await seedDatabase(db, {
      products: valid,
      categories: CATEGORY_SEED,
      homepage: HOMEPAGE_SEED,
      shop,
      seo: seoSeed(shop),
    });
  } finally {
    await close();
  }

  console.log("\nDone.\n");
}

main().catch((error) => {
  console.error("\nMigration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
