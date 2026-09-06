import "server-only";

import { and, asc, eq, ne, sql } from "drizzle-orm";

import type { Category } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { productImages, productSizes, products } from "@/lib/db/schema";
import type { ProductDraft } from "@/lib/validation/product";

/**
 * Writes to the catalogue.
 *
 * Split from the read repository because the two have different hazards. A
 * read that is wrong shows the editor stale data; a write that is wrong
 * changes the shop. Everything here is a transaction, and everything here is
 * called only from a Server Action that has already established the caller is
 * an admin and that the payload parsed.
 *
 * ── Sequential inside transactions too ───────────────────────────────────
 * Same reason as everywhere else in this app: Supabase's transaction pooler
 * resets a connection asked to pipeline concurrent queries. Inside a
 * transaction it would be wrong anyway — the statements are ordered on
 * purpose.
 */

/**
 * The handle Drizzle hands to a transaction callback.
 *
 * Derived from `db.transaction` rather than written out: a transaction is not
 * a `db` (it has no `$client`), and casting one to the other would compile
 * today and break the day Drizzle changes either shape.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ProductWriteResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: "SLUG_TAKEN" | "SKU_TAKEN" | "NOT_FOUND" };

export type ProductDeleteResult =
  | { ok: true; slug: string; name: string; storagePaths: string[] }
  | { ok: false; error: "NOT_FOUND" | "NOT_ARCHIVED" };

/** The full product record as the editor loads it. */
export type EditableProduct = ProductDraft & {
  id: string;
  status: "draft" | "published" | "archived";
  publishedAt: Date | null;
  updatedAt: Date;
};

export async function getEditableProduct(slug: string): Promise<EditableProduct | null> {
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row) return null;

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, row.id))
    .orderBy(asc(productImages.position));
  const sizes = await db.select().from(productSizes).where(eq(productSizes.productId, row.id));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categorySlug: row.categorySlug as Category,
    price: row.price,
    mrp: row.mrp,
    colour: row.colour,
    material: row.material,
    fitNote: row.fitNote,
    description: row.description,
    care: row.care,
    sku: row.sku,
    featured: row.featured,
    isNew: row.isNew,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    seoImageUrl: row.seoImageUrl,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, storagePath: i.storagePath })),
    sizes: sizes.map((s) => s.size).sort((a, b) => a - b),
    status: row.status,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Uniqueness, checked before writing so the editor gets a field-level message
 * rather than a constraint violation.
 *
 * The database still enforces both — this check is for the message, not the
 * guarantee. Two editors saving the same slug at the same moment would both
 * pass here and the second would be rejected by the unique index, which is
 * exactly the right outcome.
 */
async function findConflict(
  slug: string,
  sku: string,
  excludeId?: string,
): Promise<"SLUG_TAKEN" | "SKU_TAKEN" | null> {
  const notSelf = excludeId ? ne(products.id, excludeId) : undefined;

  const [bySlug] = await db
    .select({ id: products.id })
    .from(products)
    .where(notSelf ? and(eq(products.slug, slug), notSelf) : eq(products.slug, slug))
    .limit(1);
  if (bySlug) return "SLUG_TAKEN";

  const [bySku] = await db
    .select({ id: products.id })
    .from(products)
    .where(notSelf ? and(eq(products.sku, sku), notSelf) : eq(products.sku, sku))
    .limit(1);
  if (bySku) return "SKU_TAKEN";

  return null;
}

function columnsFrom(input: ProductDraft) {
  return {
    slug: input.slug,
    name: input.name,
    categorySlug: input.categorySlug,
    price: input.price,
    mrp: input.mrp ?? null,
    colour: input.colour,
    material: input.material,
    fitNote: input.fitNote ?? null,
    description: input.description,
    care: input.care,
    sku: input.sku,
    featured: input.featured,
    isNew: input.isNew,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    seoImageUrl: input.seoImageUrl ?? null,
    updatedAt: new Date(),
  };
}

/**
 * Replace a product's images and sizes.
 *
 * Delete-then-insert rather than a merge: both are sets, and reconciling them
 * row by row is more code and more ways to leave a stale third photograph
 * behind. It runs inside the caller's transaction, so nothing is ever
 * observed half-replaced.
 */
async function replaceChildren(
  tx: Tx,
  productId: string,
  images: ProductDraft["images"],
  sizes: number[],
) {
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  await tx.delete(productSizes).where(eq(productSizes.productId, productId));

  if (images.length > 0) {
    await tx.insert(productImages).values(
      images.map((image, position) => ({
        productId,
        url: image.url,
        alt: image.alt,
        storagePath: image.storagePath ?? null,
        position,
      })),
    );
  }

  if (sizes.length > 0) {
    /* De-duplicated because the composite primary key would reject a repeat,
       and a size listed twice in a form is a slip rather than an error worth
       stopping the save for. */
    const unique = [...new Set(sizes)].sort((a, b) => a - b);
    await tx.insert(productSizes).values(unique.map((size) => ({ productId, size })));
  }
}

export async function createProduct(input: ProductDraft): Promise<ProductWriteResult> {
  const conflict = await findConflict(input.slug, input.sku);
  if (conflict) return { ok: false, error: conflict };

  /* New products go to the end of the shelf. `position` is the tie-breaker
     under every storefront sort, so a pair with no explicit place should sit
     after the ones that have one rather than jumping to the front. */
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${products.position}), -1) + 1` })
    .from(products);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({ ...columnsFrom(input), status: "draft", position: Number(next) })
      .returning({ id: products.id, slug: products.slug });

    await replaceChildren(tx, row.id, input.images, input.sizes);
    return { ok: true, id: row.id, slug: row.slug };
  });
}

export async function updateProduct(id: string, input: ProductDraft): Promise<ProductWriteResult> {
  const conflict = await findConflict(input.slug, input.sku, id);
  if (conflict) return { ok: false, error: conflict };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(products)
      .set(columnsFrom(input))
      .where(eq(products.id, id))
      .returning({ id: products.id, slug: products.slug });

    if (!row) return { ok: false, error: "NOT_FOUND" as const };

    await replaceChildren(tx, row.id, input.images, input.sizes);
    return { ok: true, id: row.id, slug: row.slug };
  });
}

/**
 * Move a product between states.
 *
 * `publishedAt` is set the first time a pair goes live and never moved after
 * — it answers "how long has this been on the shelf", which an `updatedAt`
 * that shifts on every typo fix cannot.
 */
export async function setProductStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<{ slug: string; name: string } | null> {
  const [row] = await db
    .update(products)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "published"
        ? { publishedAt: sql`coalesce(${products.publishedAt}, now())` }
        : {}),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug, name: products.name });

  return row ?? null;
}

/**
 * Copy a pair, as a draft.
 *
 * The copy needs its own slug and SKU — both are unique and both are
 * meaningful, so they are suffixed rather than generated: an editor
 * duplicating "oxford-cap-toe-black" is going to make a variant of it, and
 * "oxford-cap-toe-black-copy" is a better starting point than a random
 * string. It never lands published, whatever the original was.
 */
export async function duplicateProduct(id: string): Promise<ProductWriteResult> {
  const [original] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!original) return { ok: false, error: "NOT_FOUND" };

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.position));
  const sizes = await db.select().from(productSizes).where(eq(productSizes.productId, id));

  const slug = await freeSuffix(original.slug, async (candidate) => {
    const [hit] = await db.select({ id: products.id }).from(products).where(eq(products.slug, candidate)).limit(1);
    return Boolean(hit);
  });
  const sku = await freeSuffix(original.sku, async (candidate) => {
    const [hit] = await db.select({ id: products.id }).from(products).where(eq(products.sku, candidate)).limit(1);
    return Boolean(hit);
  });

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${products.position}), -1) + 1` })
    .from(products);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({
        slug,
        name: `${original.name} (copy)`,
        categorySlug: original.categorySlug,
        price: original.price,
        mrp: original.mrp,
        colour: original.colour,
        material: original.material,
        fitNote: original.fitNote,
        description: original.description,
        care: original.care,
        sku,
        /* Never inherited: two featured copies of one shoe on the home page
           is the opposite of what duplicating is for. */
        featured: false,
        isNew: false,
        status: "draft",
        position: Number(next),
      })
      .returning({ id: products.id, slug: products.slug });

    if (images.length > 0) {
      await tx.insert(productImages).values(
        images.map((image, position) => ({
          productId: row.id,
          url: image.url,
          alt: image.alt,
          /* The copy points at the same stored objects. `storagePath` stays
             null so deleting the copy can never delete a file the original
             is still using. */
          storagePath: null,
          position,
        })),
      );
    }

    if (sizes.length > 0) {
      await tx.insert(productSizes).values(sizes.map((s) => ({ productId: row.id, size: s.size })));
    }

    return { ok: true, id: row.id, slug: row.slug };
  });
}

/** `x` → `x-copy`, then `x-copy-2`, until one is free. */
async function freeSuffix(base: string, taken: (candidate: string) => Promise<boolean>) {
  const first = `${base}-copy`;
  if (!(await taken(first))) return first;

  for (let n = 2; n < 50; n += 1) {
    const candidate = `${base}-copy-${n}`;
    if (!(await taken(candidate))) return candidate;
  }

  /* Fifty copies of one shoe is not a real case; a timestamp is a better
     outcome than a loop that cannot end. */
  return `${base}-copy-${Date.now()}`;
}

export async function getProductIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  return row?.id ?? null;
}

/**
 * Delete a product for good.
 *
 * ── Archived first, always ───────────────────────────────────────────────
 * A published or draft pair cannot be deleted, only archived. Its address may
 * be sitting in someone's WhatsApp chat, and archiving keeps the row so that
 * link resolves to a proper "not found" rather than to a different shoe.
 * Deleting is the second, deliberate step once the pair has been off the shop
 * long enough that nobody is still holding the link — which is a judgement the
 * shop owner makes, not one this function can.
 *
 * Refusing here rather than trusting the caller is the point: this is reachable
 * from a Server Action, which is an HTTP endpoint anyone can call.
 *
 * ── What goes with it ────────────────────────────────────────────────────
 * The image rows, the size rows and any home page pin all cascade — see the
 * `onDelete` rules in lib/db/schema.ts. The uploaded *files* do not: they live
 * in Supabase Storage, which knows nothing about this table, so their paths are
 * returned for the caller to clean up once it has checked nothing else uses
 * them.
 */
export async function deleteProduct(id: string): Promise<ProductDeleteResult> {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return { ok: false, error: "NOT_FOUND" };
  if (product.status !== "archived") return { ok: false, error: "NOT_ARCHIVED" };

  /* Read the paths before the row goes — the cascade takes the image rows
     with it, and with them the only record of where the files are. */
  const images = await db
    .select({ storagePath: productImages.storagePath })
    .from(productImages)
    .where(eq(productImages.productId, id));

  await db.delete(products).where(eq(products.id, id));

  return {
    ok: true,
    slug: product.slug,
    name: product.name,
    /* Null for the placeholder images, which the shop does not own. */
    storagePaths: images.map((i) => i.storagePath).filter((p): p is string => Boolean(p)),
  };
}
