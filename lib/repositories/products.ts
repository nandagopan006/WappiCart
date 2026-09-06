import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import type { Category } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { productImages, productSizes, products } from "@/lib/db/schema";

/**
 * Reads products for the ADMIN. Sees drafts and archived pairs too.
 *
 * The public shop uses lib/products.ts instead, which only ever returns
 * published products. Keeping them in separate files is deliberate: if the
 * shop could call these functions, one forgotten filter would put an
 * unfinished product on the live site.
 *
 * Nothing here is cached — an editor who saves and does not immediately see
 * the change will assume it failed.
 */

export type ProductStatus = "draft" | "published" | "archived";

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: Category;
  price: number;
  mrp: number | null;
  status: ProductStatus;
  featured: boolean;
  isNew: boolean;
  updatedAt: Date;
  image: string | null;
  imageCount: number;
  sizes: number[];
};

export type ProductListFilters = {
  search?: string;
  category?: Category | null;
  status?: ProductStatus | null;
  featured?: boolean | null;
  isNew?: boolean | null;
  sort?: "updated" | "name" | "price-asc" | "price-desc" | "shelf";
  page?: number;
  pageSize?: number;
  /**
   * Skip loading photographs and sizes.
   *
   * The table shows both, so it leaves this off. The dashboard's little list
   * of drafts shows neither, and each of them is a 70ms round trip it was
   * paying for nothing.
   */
  withDetails?: boolean;
};

export const ADMIN_PAGE_SIZE = 20;

/**
 * One page of the product table, with search, filters and sorting.
 *
 * Only loads images and sizes for the rows actually shown.
 */
export async function listProducts(filters: ProductListFilters = {}) {
  const {
    search,
    category,
    status,
    featured,
    isNew,
    sort = "updated",
    page = 1,
    pageSize = ADMIN_PAGE_SIZE,
    withDetails = true,
  } = filters;

  const conditions: SQL[] = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    /* Searches name, slug and SKU — you might have any of the three. */
    const match = or(
      ilike(products.name, term),
      ilike(products.slug, term),
      ilike(products.sku, term),
    );
    if (match) conditions.push(match);
  }

  if (category) conditions.push(eq(products.categorySlug, category));
  if (status) conditions.push(eq(products.status, status));
  if (featured != null) conditions.push(eq(products.featured, featured));
  if (isNew != null) conditions.push(eq(products.isNew, isNew));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy = {
    updated: [desc(products.updatedAt)],
    name: [asc(products.name)],
    "price-asc": [asc(products.price)],
    "price-desc": [desc(products.price)],
    shelf: [asc(products.position), asc(products.createdAt)],
  }[sort];

  /* The page of rows AND the total, in one query.
     `count(*) OVER ()` is a window function: it counts every row the filter
     matched, ignoring the LIMIT, and attaches that number to each row. Asking
     separately would be another 70ms round trip for a single integer. */
  const rows = await db
    .select({ row: products, total: sql<number>`count(*) over ()::int` })
    .from(products)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .then((result) => result.map((r) => ({ ...r.row, __total: Number(r.total) })));

  const total = rows[0]?.__total ?? 0;

  if (rows.length === 0) {
    return { rows: [] as AdminProductRow[], total: Number(total), page, pageSize };
  }

  if (!withDetails) {
    return {
      rows: rows.map((row): AdminProductRow => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        sku: row.sku,
        category: row.categorySlug as Category,
        price: row.price,
        mrp: row.mrp,
        status: row.status,
        featured: row.featured,
        isNew: row.isNew,
        updatedAt: row.updatedAt,
        image: null,
        imageCount: 0,
        sizes: [],
      })),
      total: Number(total),
      page,
      pageSize,
    };
  }

  const ids = rows.map((r) => r.id);

  /* Photographs and sizes for the whole page, in ONE query.
     Two separate SELECTs meant two round trips for information the table
     needs together. Postgres can summarise both per product in a single pass,
     so this asks for exactly what the row renders: the first photograph, how
     many there are, and the sizes as a sorted list.

     Written with the query builder and `inArray`, NOT by pasting the ids into
     a string. Drizzle sends them as parameters, so a value can never be read
     as SQL. These particular ids are database UUIDs and could not carry an
     injection today — but building SQL by concatenation is how a query that
     is safe today becomes the hole tomorrow, when someone passes it something
     a user typed. */
  const extras = await db
    .select({
      id: products.id,
      firstImage: sql<string | null>`(
        select i.url from product_images i
        where i.product_id = ${products.id}
        order by i.position limit 1
      )`,
      imageCount: sql<number>`(
        select count(*)::int from product_images i where i.product_id = ${products.id}
      )`,
      sizes: sql<number[]>`coalesce((
        select array_agg(s.size order by s.size)
        from product_sizes s where s.product_id = ${products.id}
      ), '{}')`,
    })
    .from(products)
    .where(inArray(products.id, ids));

  const firstImage = new Map<string, string>();
  const imageCount = new Map<string, number>();
  const sizesByProduct = new Map<string, number[]>();

  for (const row of extras) {
    if (row.firstImage) firstImage.set(row.id, row.firstImage);
    imageCount.set(row.id, Number(row.imageCount));
    sizesByProduct.set(row.id, (row.sizes ?? []).map(Number));
  }

  return {
    rows: rows.map((row): AdminProductRow => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      sku: row.sku,
      category: row.categorySlug as Category,
      price: row.price,
      mrp: row.mrp,
      status: row.status,
      featured: row.featured,
      isNew: row.isNew,
      updatedAt: row.updatedAt,
      image: firstImage.get(row.id) ?? null,
      imageCount: imageCount.get(row.id) ?? 0,
      sizes: (sizesByProduct.get(row.id) ?? []).sort((a, b) => a - b),
    })),
    total: Number(total),
    page,
    pageSize,
  };
}

/**
 * Every number the dashboard shows, in ONE query.
 *
 * This used to be four separate queries. Each round trip to the database
 * costs about 70ms, so four of them was nearly a third of a second of pure
 * waiting for six numbers that all come from the same table.
 *
 * `count(*) FILTER (WHERE ...)` is how Postgres counts several different
 * things in a single pass. Do not be tempted to run the four in parallel
 * instead — see the note about the connection pooler at the top of this file.
 */
export async function productCounts() {
  const rows = await db.execute(sql`
    select
      count(*) filter (where status = 'draft')::int      as draft,
      count(*) filter (where status = 'published')::int  as published,
      count(*) filter (where status = 'archived')::int   as archived,
      count(*) filter (where featured and status = 'published')::int as featured,
      count(*) filter (where is_new  and status = 'published')::int  as is_new,
      (
        select count(*)::int
        from product_sizes ps
        join products p on p.id = ps.product_id
        where p.status = 'published'
      ) as pairs
    from products
  `);

  const row = (rows as unknown as {
    draft: number; published: number; archived: number;
    featured: number; is_new: number; pairs: number;
  }[])[0];

  return {
    draft: Number(row?.draft ?? 0),
    published: Number(row?.published ?? 0),
    archived: Number(row?.archived ?? 0),
    total: Number(row?.draft ?? 0) + Number(row?.published ?? 0) + Number(row?.archived ?? 0),
    featured: Number(row?.featured ?? 0),
    isNew: Number(row?.is_new ?? 0),
    pairs: Number(row?.pairs ?? 0),
  };
}

/** Published pairs per shelf, for the dashboard's breakdown. */
export async function countsByCategory() {
  const rows = await db
    .select({ category: products.categorySlug, n: count() })
    .from(products)
    .where(eq(products.status, "published"))
    .groupBy(products.categorySlug);

  return rows.map((r) => ({ category: r.category as Category, count: Number(r.n) }));
}

/**
 * Live products that are missing something a shopper would notice — too few
 * photos, or almost no sizes left. Shown on the dashboard.
 */
export async function productsNeedingAttention(limit = 8) {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      status: products.status,
      images: sql<number>`(select count(*)::int from product_images pi where pi.product_id = ${products.id})`,
      sizes: sql<number>`(select count(*)::int from product_sizes ps where ps.product_id = ${products.id})`,
    })
    .from(products)
    .where(eq(products.status, "published"))
    .limit(200);

  const flagged: { slug: string; name: string; reason: string }[] = [];

  for (const row of rows) {
    const images = Number(row.images);
    const sizes = Number(row.sizes);

    if (images < 2) {
      flagged.push({ slug: row.slug, name: row.name, reason: "fewer than 2 photographs" });
    } else if (sizes === 0) {
      flagged.push({ slug: row.slug, name: row.name, reason: "no sizes in stock" });
    } else if (sizes <= 2) {
      flagged.push({ slug: row.slug, name: row.name, reason: `only ${sizes} size${sizes === 1 ? "" : "s"} left` });
    }

    if (flagged.length >= limit) break;
  }

  return flagged;
}

/*
 * Shelves are read from lib/repositories/categories.ts, not from here. This
 * file had its own `listCategories` while they were four fixed rows; two
 * implementations of "list the shelves" is one too many now that they can be
 * created and deleted.
 */
