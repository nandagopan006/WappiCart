"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { recordActivity } from "@/lib/activity";
import { requireAdminForAction } from "@/lib/auth";
import { PRODUCTS_TAG } from "@/lib/products";
import { listShelvesForEditing } from "@/lib/repositories/categories";
import {
  countImageReferences,
  deleteStoredObject,
} from "@/lib/repositories/media";
import {
  createProduct,
  deleteProduct,
  duplicateProduct,
  getEditableProduct,
  getProductIdBySlug,
  setProductStatus,
  updateProduct,
} from "@/lib/repositories/product-write";
import {
  productDraftSchema,
  productPublishableSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/product";

/**
 * Everything the admin can do to a product: save, publish, archive, restore,
 * duplicate, delete.
 *
 * Every function here follows the same six steps:
 *   1. check the person is an admin
 *   2. check the data is valid
 *   3. write to the database
 *   4. record what changed
 *   5. clear the cached pages
 *   6. return { ok: true } or { ok: false, error: "..." }
 *
 * Step 1 is not optional. These are web endpoints — anyone can call one
 * directly without ever opening the admin, so the login check on the page is
 * not enough.
 *
 * They return errors rather than throwing, so the form can show the message.
 * Database errors are logged on the server and replaced with a plain sentence
 * — stack traces never reach the browser.
 */

export type ActionResult =
  | { ok: true; slug: string; message: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

const UNAUTHORISED: ActionResult = {
  ok: false,
  error: "Your session has expired. Sign in again.",
};

const CONFLICT_MESSAGES: Record<string, { field: string; message: string }> = {
  SLUG_TAKEN: {
    field: "slug",
    message: "Another product already uses that slug. Slugs are web addresses, so they must be unique.",
  },
  SKU_TAKEN: {
    field: "sku",
    message: "Another product already uses that SKU. It goes into the WhatsApp message, so it must be unique.",
  },
  NOT_FOUND: { field: "_form", message: "That product no longer exists." },
};

/**
 * Rebuild every page a product can appear on.
 *
 * One tag covers all the product queries. The paths are listed separately
 * because those pages are pre-built and the tag alone will not refresh them.
 */
function revalidateStorefront(slug?: string) {
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/wishlist");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/p/${slug}`);
}

/** Check the form data against the draft rules. */
function parseDraft(raw: unknown) {
  const parsed = productDraftSchema.safeParse(raw);
  return parsed.success
    ? ({ ok: true, data: parsed.data } as const)
    : ({ ok: false, fieldErrors: toFieldErrors(parsed.error) } as const);
}

export async function saveProductAction(
  raw: unknown,
  options: { id?: string; publish?: boolean } = {},
): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = parseDraft(raw);
  if (!parsed.ok) {
    return { ok: false, error: "Some fields need attention.", fieldErrors: parsed.fieldErrors };
  }

  /* Publishing needs everything: 2-4 photos, at least one size, and all the
     description fields. A draft can be incomplete; a live product cannot. */
  if (options.publish) {
    const publishable = productPublishableSchema.safeParse(raw);
    if (!publishable.success) {
      return {
        ok: false,
        error: "This pair is not ready to publish.",
        fieldErrors: toFieldErrors(publishable.error),
      };
    }
  }

  /* The shelf has to exist. Shelves are rows now, not a fixed list, so the
     schema cannot check this — it would have to know the database. Without
     this the write reaches Postgres, the foreign key rejects it, and the
     editor is told "Could not save" with no idea which field is wrong.

     Read UNCACHED and including hidden shelves. `getShelves()` is neither:
     it is cached, so a shelf created a moment ago is not in it yet, and it
     drops disabled ones — but a product may legitimately sit on a hidden
     shelf, since hiding one must not orphan its pairs. Using it here refused
     saves that should have worked. */
  const shelves = await listShelvesForEditing();
  if (!shelves.some((shelf) => shelf.slug === parsed.data.categorySlug)) {
    const message = "That shelf no longer exists. Pick another one.";
    return { ok: false, error: message, fieldErrors: { categorySlug: message } };
  }

  try {
    const result = options.id
      ? await updateProduct(options.id, parsed.data)
      : await createProduct(parsed.data);

    if (!result.ok) {
      const conflict = CONFLICT_MESSAGES[result.error];
      return {
        ok: false,
        error: conflict.message,
        fieldErrors: { [conflict.field]: conflict.message },
      };
    }

    if (options.publish) await setProductStatus(result.id, "published");

    await recordActivity({
      adminId: auth.admin.id,
      action: options.id
        ? options.publish
          ? "product.published"
          : "product.updated"
        : "product.created",
      entityType: "product",
      entityId: result.id,
      entityLabel: parsed.data.name,
      metadata: { slug: result.slug },
    });

    revalidateStorefront(result.slug);
    revalidatePath("/admin/products");

    return {
      ok: true,
      slug: result.slug,
      message: options.publish ? "Published." : options.id ? "Saved." : "Draft created.",
    };
  } catch (error) {
    console.error("[saveProductAction]", error);
    return { ok: false, error: "Could not save. The change was not applied — try again." };
  }
}

async function changeStatus(
  slug: string,
  status: "draft" | "published" | "archived",
  action: "product.published" | "product.unpublished" | "product.archived" | "product.restored",
  message: string,
): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  try {
    const id = await getProductIdBySlug(slug);
    if (!id) return { ok: false, error: "That product no longer exists." };

    /* The Publish button in the table has to run the same checks as the one
       in the form, or it becomes a way around them. */
    if (status === "published") {
      const product = await getEditableProduct(slug);
      if (!product) return { ok: false, error: "That product no longer exists." };

      const publishable = productPublishableSchema.safeParse(product);
      if (!publishable.success) {
        const first = Object.values(toFieldErrors(publishable.error))[0];
        return {
          ok: false,
          error: `Not ready to publish. ${first ?? "Some fields are missing."}`,
        };
      }
    }

    const row = await setProductStatus(id, status);
    if (!row) return { ok: false, error: "That product no longer exists." };

    await recordActivity({
      adminId: auth.admin.id,
      action,
      entityType: "product",
      entityId: id,
      entityLabel: row.name,
      metadata: { slug: row.slug, status },
    });

    revalidateStorefront(row.slug);
    revalidatePath("/admin/products");

    return { ok: true, slug: row.slug, message };
  } catch (error) {
    console.error("[changeStatus]", error);
    return { ok: false, error: "Could not change the status. Nothing was applied — try again." };
  }
}

export async function publishProductAction(slug: string) {
  return changeStatus(slug, "published", "product.published", "Published.");
}

export async function unpublishProductAction(slug: string) {
  return changeStatus(slug, "draft", "product.unpublished", "Moved back to draft.");
}

/**
 * Archive, never delete.
 *
 * The product's web address may be sitting in someone's WhatsApp chat.
 * Archiving hides it but keeps the row, so that link shows a proper
 * "not found" instead of a completely different shoe.
 */
export async function archiveProductAction(slug: string) {
  return changeStatus(slug, "archived", "product.archived", "Archived.");
}

export async function restoreProductAction(slug: string) {
  return changeStatus(slug, "draft", "product.restored", "Restored as a draft.");
}

export async function duplicateProductAction(slug: string): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  try {
    const id = await getProductIdBySlug(slug);
    if (!id) return { ok: false, error: "That product no longer exists." };

    const result = await duplicateProduct(id);
    if (!result.ok) return { ok: false, error: "Could not duplicate that product." };

    await recordActivity({
      adminId: auth.admin.id,
      action: "product.duplicated",
      entityType: "product",
      entityId: result.id,
      entityLabel: result.slug,
      metadata: { from: slug },
    });

    /* No need to rebuild the shop — a copy is always a draft. */
    revalidatePath("/admin/products");

    return { ok: true, slug: result.slug, message: "Duplicated as a draft." };
  } catch (error) {
    console.error("[duplicateProductAction]", error);
    return { ok: false, error: "Could not duplicate that product. Try again." };
  }
}

/**
 * Delete an archived product for good.
 *
 * ── Only an archived pair ────────────────────────────────────────────────
 * A live or draft pair has no delete, by design. Its `/p/<slug>` address may
 * be in someone's WhatsApp chat, so it is archived first — which keeps the row
 * and makes that link a proper "not found" — and deleted afterwards, once the
 * shop owner is satisfied nobody is still holding it. The repository refuses
 * anything else; this check is here so the refusal reads as a sentence rather
 * than a generic failure.
 *
 * ── The photographs ──────────────────────────────────────────────────────
 * The image, size and home page rows cascade with the product. The uploaded
 * files do not — Supabase Storage has no idea this table exists — so each one
 * is removed only after checking no other pair still points at it. A file
 * shared with another product is left exactly where it is.
 *
 * A file that fails to delete is logged, not surfaced: the product is already
 * gone, and reporting a storage error as though the delete failed would send
 * the editor back to a product that no longer exists. It becomes an orphan in
 * the media screen, which is where orphans are meant to be dealt with.
 */
export async function deleteProductAction(slug: string): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  try {
    const id = await getProductIdBySlug(slug);
    if (!id) return { ok: false, error: "That product no longer exists." };

    const result = await deleteProduct(id);

    if (!result.ok) {
      return {
        ok: false,
        error:
          result.error === "NOT_ARCHIVED"
            ? "Only an archived pair can be deleted. Archive it first — that takes it off the shop while keeping its link working."
            : "That product no longer exists.",
      };
    }

    await recordActivity({
      adminId: auth.admin.id,
      action: "product.deleted",
      entityType: "product",
      entityId: id,
      entityLabel: result.name,
      metadata: { slug: result.slug, images: result.storagePaths.length },
    });

    /* Sequential, and after the row is gone so the count reflects reality. */
    for (const path of result.storagePaths) {
      const references = await countImageReferences(path);
      if (references.count > 0) continue;

      const removed = await deleteStoredObject(path);
      if (!removed.ok) {
        console.error(`[deleteProductAction] left "${path}" in storage: ${removed.error}`);
      }
    }

    revalidateStorefront(result.slug);
    revalidatePath("/admin/products");
    revalidatePath("/admin/media");

    return { ok: true, slug: result.slug, message: `${result.name} deleted.` };
  } catch (error) {
    console.error("[deleteProductAction]", error);
    return { ok: false, error: "Could not delete that product. Nothing was changed — try again." };
  }
}
