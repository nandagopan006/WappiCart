import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";

import type { Shelf } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/validation/category";

/**
 * The shelves: reading them for the shop, and writing them from the admin.
 *
 * These used to be four fixed rows that only ever got updated, which is why
 * they lived alongside the About page in lib/repositories/settings.ts. They
 * are a full collection now — created, reordered and deleted — so they get
 * their own file, the same split the products have.
 *
 * Reads are split by audience, like the products are: `getShelves` is the
 * storefront's and only returns enabled rows, so a shelf turned off cannot
 * appear in the header, the filters or the home page. `listShelvesForEditing`
 * is the admin's and sees everything.
 */

export const CATEGORIES_TAG = "categories";

/* ── Reading ────────────────────────────────────────────────────────────── */

function toShelf(row: typeof categories.$inferSelect): Shelf {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    position: row.position,
    enabled: row.enabled,
  };
}

const loadShelves = unstable_cache(
  async (): Promise<Shelf[]> => {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.enabled, true))
      .orderBy(asc(categories.position), asc(categories.slug));
    return rows.map(toShelf);
  },
  ["categories-enabled"],
  { tags: [CATEGORIES_TAG] },
);

/**
 * The shelves the shop browses by. Enabled only, in the admin's order.
 *
 * Cached until an edit clears the tag, and deduped per render — the header,
 * the shop page and the home page all call it and it costs one query.
 */
export const getShelves = cache(loadShelves);

const loadAllShelves = unstable_cache(
  async (): Promise<Shelf[]> => {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.slug));
    return rows.map(toShelf);
  },
  ["categories-all"],
  { tags: [CATEGORIES_TAG] },
);

/** Every shelf including the hidden ones. For anything that resolves a slug. */
export const getAllShelves = cache(loadAllShelves);

/** Uncached, for the editor — it has to show what is stored, not what is cached. */
export async function listShelvesForEditing(): Promise<Shelf[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.slug));
  return rows.map(toShelf);
}

export async function getShelf(slug: string): Promise<Shelf | null> {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ? toShelf(row) : null;
}

export type ShelfUsage = {
  slug: string;
  published: number;
  draft: number;
  archived: number;
  total: number;
};

/**
 * How many pairs sit on each shelf, by status.
 *
 * All three statuses, not just published: this is what the delete button
 * reads, and an archived pair still holds a foreign key. Counting only the
 * live ones would offer a delete that the database then refuses.
 */
export async function shelfUsage(): Promise<Record<string, ShelfUsage>> {
  const rows = await db
    .select({
      slug: products.categorySlug,
      status: products.status,
      n: sql<number>`count(*)::int`,
    })
    .from(products)
    .groupBy(products.categorySlug, products.status);

  const usage: Record<string, ShelfUsage> = {};

  for (const row of rows) {
    const entry = (usage[row.slug] ??= {
      slug: row.slug,
      published: 0,
      draft: 0,
      archived: 0,
      total: 0,
    });
    entry[row.status] = Number(row.n);
    entry.total += Number(row.n);
  }

  return usage;
}

/* ── Writing ────────────────────────────────────────────────────────────── */

export type ShelfWriteResult =
  | { ok: true; slug: string }
  | { ok: false; error: "SLUG_TAKEN" | "NOT_FOUND" | "IN_USE" | "LAST_SHELF" };

/**
 * Add a shelf.
 *
 * It lands at the end of the order rather than the start: a new shelf is
 * usually empty, and putting an empty shelf first is the sort of thing an
 * editor has to undo immediately.
 */
export async function createShelf(input: CategoryCreateInput): Promise<ShelfWriteResult> {
  const existing = await getShelf(input.slug);
  if (existing) return { ok: false, error: "SLUG_TAKEN" };

  const [{ next } = { next: 0 }] = await db
    .select({ next: sql<number>`coalesce(max(${categories.position}), -1) + 1` })
    .from(categories);

  const [row] = await db
    .insert(categories)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      enabled: input.enabled,
      position: Number(next),
    })
    .returning({ slug: categories.slug });

  return row ? { ok: true, slug: row.slug } : { ok: false, error: "NOT_FOUND" };
}

/** Edit a shelf's copy and visibility. The slug is not touched — it is the address. */
export async function updateShelf(
  slug: string,
  input: Omit<CategoryUpdateInput, "slug" | "position">,
): Promise<ShelfWriteResult> {
  const [row] = await db
    .update(categories)
    .set({
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      enabled: input.enabled,
      updatedAt: new Date(),
    })
    .where(eq(categories.slug, slug))
    .returning({ slug: categories.slug });

  return row ? { ok: true, slug: row.slug } : { ok: false, error: "NOT_FOUND" };
}

/**
 * Delete a shelf.
 *
 * Refused while any product still points at it — including drafts and
 * archived pairs, which is what the `onDelete: "restrict"` on
 * `products.category_slug` enforces anyway. Checking here first turns a
 * database error into a sentence that says which pairs are in the way.
 *
 * Also refused when it is the last one: a shop with no shelves has a header
 * nav with nothing in it and a shop page whose filter row is empty.
 */
export async function deleteShelf(slug: string): Promise<ShelfWriteResult> {
  const shelf = await getShelf(slug);
  if (!shelf) return { ok: false, error: "NOT_FOUND" };

  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categorySlug, slug));

  if (Number(n) > 0) return { ok: false, error: "IN_USE" };

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(categories);

  if (Number(total) <= 1) return { ok: false, error: "LAST_SHELF" };

  await db.delete(categories).where(eq(categories.slug, slug));

  return { ok: true, slug };
}

/**
 * Write a new order.
 *
 * Positions come from the array's order rather than from the client, and the
 * whole list is written in one transaction so the shop never reads a
 * half-applied order.
 */
export async function reorderShelves(slugs: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, slug] of slugs.entries()) {
      await tx
        .update(categories)
        .set({ position: index, updatedAt: new Date() })
        .where(eq(categories.slug, slug));
    }
  });
}

/** Turn one shelf on or off without touching its copy. */
export async function setShelfEnabled(slug: string, enabled: boolean): Promise<ShelfWriteResult> {
  const [row] = await db
    .update(categories)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(categories.slug, slug))
    .returning({ slug: categories.slug });

  return row ? { ok: true, slug: row.slug } : { ok: false, error: "NOT_FOUND" };
}

/** How many shelves are currently on. The last one cannot be turned off. */
export async function enabledShelfCount(): Promise<number> {
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .where(eq(categories.enabled, true));
  return Number(n);
}
