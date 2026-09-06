import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";

import {
  countByCategoryFrom,
  pairsInStockFrom,
  relatedFrom,
  sizesInStockFrom,
  type Category,
  type Product,
} from "@/lib/catalogue";
import { db } from "@/lib/db";
import { productImages, productSizes, products as productsTable } from "@/lib/db/schema";
import { getShelves } from "@/lib/repositories/categories";
import { storefrontProductSchema } from "@/lib/validation/product";

/**
 * Reads products from the database, for the public shop.
 *
 * THE IMPORTANT RULE: every function here only returns *published* products.
 * Drafts and archived pairs are filtered out in the query itself, so they can
 * never leak onto the shop, the sitemap or a share image. The admin uses
 * lib/repositories/products.ts instead, which sees everything.
 *
 * It loads the whole catalogue once and works the rest out in memory. With a
 * dozen products that is faster and simpler than many separate queries.
 *
 * Results are cached until a product is saved, then rebuilt.
 */

export const PRODUCTS_TAG = "products";

/* ── Loading ────────────────────────────────────────────────────────────── */

/**
 * Loads products, their images and their sizes, then joins them in JavaScript.
 *
 * Three small queries rather than one big JOIN: a JOIN would return the same
 * product once per image per size, which then has to be de-duplicated.
 */
const loadCatalogue = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      /* Shelf order, which is the tie-breaker under every sort in Catalog. */
      .orderBy(asc(productsTable.position), asc(productsTable.createdAt));

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);

    /* One after the other, not Promise.all. Two queries sent down one pooled
       connection at the same time is what Supabase's transaction pooler
       resets — the failure the whole project is written to avoid. */
    const images = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position));

    const sizes = await db
      .select()
      .from(productSizes)
      .where(inArray(productSizes.productId, ids));

    const imagesByProduct = new Map<string, typeof images>();
    for (const image of images) {
      const list = imagesByProduct.get(image.productId) ?? [];
      list.push(image);
      imagesByProduct.set(image.productId, list);
    }

    const sizesByProduct = new Map<string, number[]>();
    for (const row of sizes) {
      const list = sizesByProduct.get(row.productId) ?? [];
      list.push(row.size);
      sizesByProduct.set(row.productId, list);
    }

    const catalogue: Product[] = [];

    for (const row of rows) {
      const rowImages = imagesByProduct.get(row.id) ?? [];
      const rowSizes = (sizesByProduct.get(row.id) ?? []).sort((a, b) => a - b);

      const product = {
        slug: row.slug,
        name: row.name,
        category: row.categorySlug as Category,
        price: row.price,
        ...(row.mrp != null ? { mrp: row.mrp } : {}),
        images: rowImages.map((i) => i.url),
        /* Always images[0], so the two can never disagree. */
        image: rowImages[0]?.url ?? "",
        alt: rowImages[0]?.alt ?? "",
        sizes: rowSizes,
        colour: row.colour,
        material: row.material,
        ...(row.fitNote ? { fitNote: row.fitNote } : {}),
        description: row.description,
        care: row.care,
        ...(row.featured ? { featured: true } : {}),
        ...(row.isNew ? { isNew: true } : {}),
        sku: row.sku,
      };

      /* A final safety check. If one row is somehow broken — edited by hand
         in Supabase, say — hide that product and log it, rather than letting
         it break the whole page. */
      const checked = storefrontProductSchema.safeParse(product);

      if (!checked.success) {
        console.error(
          `[products] "${row.slug}" is published but failed validation and was hidden:`,
          checked.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        );
        continue;
      }

      catalogue.push(product as Product);
    }

    return catalogue;
  },
  ["catalogue"],
  { tags: [PRODUCTS_TAG] },
);

/** Every published pair, in shelf order. */
export const publishedProducts = cache(loadCatalogue);

/* ── Derived views ──────────────────────────────────────────────────────── */

/** The pairs the shop wants at the top of the homepage grid. */
export async function featuredProducts(): Promise<Product[]> {
  return (await publishedProducts()).filter((p) => p.featured);
}

/**
 * Pairs marked "new". If none are marked, falls back to the front of the
 * shelf so the "New in" section is never empty.
 */
export async function newProducts(limit = 4): Promise<Product[]> {
  const catalogue = await publishedProducts();
  const flagged = catalogue.filter((p) => p.isNew);
  return (flagged.length > 0 ? flagged : catalogue).slice(0, limit);
}

/**
 * How many pairs sit on each shelf, for the home page's shelf list.
 *
 * Every visible shelf is a key, including the ones holding nothing — a shelf
 * with no stock should read "0 pairs", not be missing from the page.
 *
 * Sequential rather than parallel: the transaction pooler resets a connection
 * asked to pipeline two reads at once.
 */
export async function countByCategory(): Promise<Record<Category, number>> {
  const catalogue = await publishedProducts();
  const shelves = await getShelves();
  return countByCategoryFrom(catalogue, shelves);
}

/** A few pairs from each shelf, for the home page's category rows. */
export async function previewByCategory(limit = 3): Promise<Record<Category, Product[]>> {
  const catalogue = await publishedProducts();
  const shelves = await getShelves();

  return Object.fromEntries(
    shelves.map((s) => [s.slug, catalogue.filter((p) => p.category === s.slug).slice(0, limit)]),
  );
}

/** Other pairs from the same shelf, for "More in {category}". */
export async function relatedProducts(product: Product, limit = 3): Promise<Product[]> {
  return relatedFrom(await publishedProducts(), product, limit);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await publishedProducts()).find((p) => p.slug === slug);
}

/** Live count for the hero. Real numbers build trust. */
export async function pairsInStock(): Promise<number> {
  return pairsInStockFrom(await publishedProducts());
}

/** Sizes that at least one product still has, used to dim the filter run. */
export async function sizesInStock(): Promise<number[]> {
  return sizesInStockFrom(await publishedProducts());
}

/** Shelves that currently have at least one pair, in the admin's order. */
export async function categoriesInStock(): Promise<Category[]> {
  const catalogue = await publishedProducts();
  const shelves = await getShelves();
  const stocked = new Set(catalogue.map((p) => p.category));
  return shelves.filter((s) => stocked.has(s.slug)).map((s) => s.slug);
}

/* ── The contract ───────────────────────────────────────────────────────── */

/**
 * Passed straight through from lib/catalogue.ts, so server code can get
 * everything it needs from one import.
 *
 * Browser components must import those from "@/lib/catalogue" instead. This
 * file is server-only, and importing it from the browser fails the build.
 */
export {
  SIZE_RUN,
  PRICE_BANDS,
  SLUG_PATTERN,
  inPriceBand,
  isCategoryIn,
  isSize,
  relatedFrom,
  formatPrice,
  formatPriceForImage,
  type Category,
  type Shelf,
  type Product,
  type PriceBandId,
  type Size,
} from "@/lib/catalogue";
