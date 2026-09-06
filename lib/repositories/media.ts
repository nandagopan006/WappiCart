import "server-only";

import { eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { createAdminClient, PRODUCT_IMAGE_BUCKET } from "@/lib/supabase/admin";

/**
 * The media library.
 *
 * ── Two sources, joined by path ──────────────────────────────────────────
 * Supabase Storage knows what files exist; the database knows what uses them.
 * Neither alone can answer the only question the library really has to
 * answer, which is "is this safe to delete?". So the listing walks the bucket
 * and annotates each object with the products that reference it.
 *
 * A file with no references is orphaned — usually an upload that was never
 * saved, because the editor changed their mind after choosing it. Those are
 * the ones worth clearing out, and they are the only ones deletion allows.
 */

export type MediaItem = {
  storagePath: string;
  url: string;
  name: string;
  bytes: number | null;
  createdAt: string | null;
  /** Product names that point at this file. Empty means orphaned. */
  usedBy: string[];
};

/**
 * Every object in the bucket, newest first.
 *
 * The bucket is listed one folder deep — `products/<ref>/<file>` — because
 * Supabase's list API does not recurse. That matches exactly how uploads are
 * laid out, so nothing is missed unless a file was put there by hand.
 */
export async function listStoredObjects(): Promise<MediaItem[]> {
  const supabase = createAdminClient();

  const { data: folders, error: folderError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .list("products", { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (folderError) {
    console.error("[listStoredObjects] listing folders:", folderError);
    return [];
  }

  const references = await imageReferenceMap();
  const items: MediaItem[] = [];

  for (const folder of folders ?? []) {
    /* Storage returns folders as entries with no `id`. A stray file directly
       under `products/` is skipped rather than guessed at. */
    if (folder.id) continue;

    const prefix = `products/${folder.name}`;
    const { data: files, error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .list(prefix, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error(`[listStoredObjects] listing ${prefix}:`, error);
      continue;
    }

    for (const file of files ?? []) {
      if (!file.id) continue;

      const storagePath = `${prefix}/${file.name}`;
      const {
        data: { publicUrl },
      } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);

      items.push({
        storagePath,
        url: publicUrl,
        name: file.name,
        bytes: (file.metadata?.size as number | undefined) ?? null,
        createdAt: file.created_at ?? null,
        usedBy: references.get(storagePath) ?? [],
      });
    }
  }

  return items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/**
 * Which products point at which stored file.
 *
 * One query rather than one per file. `storagePath` is null for the Unsplash
 * placeholders, which this app does not own and must never try to delete, so
 * those rows are excluded outright.
 */
async function imageReferenceMap(): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ storagePath: productImages.storagePath, name: products.name })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(isNotNull(productImages.storagePath));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.storagePath) continue;
    const list = map.get(row.storagePath) ?? [];
    if (!list.includes(row.name)) list.push(row.name);
    map.set(row.storagePath, list);
  }
  return map;
}

/** Everything still using this file. `count` is what gates deletion. */
export async function countImageReferences(
  storagePath: string,
): Promise<{ count: number; products: string[] }> {
  const rows = await db
    .select({ name: products.name })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(eq(productImages.storagePath, storagePath));

  const names = [...new Set(rows.map((r) => r.name))];
  return { count: rows.length, products: names };
}

export async function deleteStoredObject(
  storagePath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  /* The path is only ever taken from a listing, but it reaches here through a
     Server Action — which is an HTTP endpoint anyone can call with anything.
     Anchoring it to the upload layout means a crafted value cannot reach a
     file this app did not put there. */
  if (!/^products\/[a-z0-9-]+\/[0-9]+-[0-9a-f]{8}\.(jpg|png|webp|avif)$/.test(storagePath)) {
    return { ok: false, error: "That does not look like a file this shop uploaded." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);

  if (error) {
    console.error("[deleteStoredObject]", error);
    return { ok: false, error: "Storage refused the delete. Try again." };
  }

  return { ok: true };
}
