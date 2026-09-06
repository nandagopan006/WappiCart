"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { recordActivity } from "@/lib/activity";
import { requireAdminForAction } from "@/lib/auth";
import { PRODUCTS_TAG } from "@/lib/products";
import {
  CATEGORIES_TAG,
  createShelf,
  deleteShelf,
  enabledShelfCount,
  getShelf,
  reorderShelves,
  setShelfEnabled,
  updateShelf,
  type ShelfWriteResult,
} from "@/lib/repositories/categories";
import {
  categoryCreateSchema,
  categoryReorderSchema,
  categoryToggleSchema,
  categoryUpdateSchema,
} from "@/lib/validation/category";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/product";

/**
 * Everything the admin can do to a shelf: create, edit, reorder, show, hide,
 * delete.
 *
 * Same pipeline as every other mutation in this app — authenticate, validate,
 * write, log, revalidate, return a typed result. The auth check is not a
 * duplicate of the layout's: a Server Action is its own HTTP endpoint and can
 * be called without ever loading the page.
 *
 * Errors are returned rather than thrown, so the form can show the message.
 * Database errors are logged on the server and replaced with a plain sentence.
 */

export type CategoryResult =
  | { ok: true; slug: string; message: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

const UNAUTHORISED: CategoryResult = {
  ok: false,
  error: "Your session has expired. Sign in again.",
};

/**
 * Rebuild everything a shelf's name, blurb or order can appear on.
 *
 * A shelf is in the header of every page, so this is deliberately broad. It
 * runs only on an admin write, which happens a few times a day at most.
 */
function revalidateShelves(slug?: string) {
  revalidateTag(CATEGORIES_TAG);
  /* Shelf copy shows on the home page's stories and tiles, and the counts
     beside them come from the catalogue. */
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/categories");
  if (slug) revalidatePath(`/admin/categories/${slug}`);
}

/** Turn a repository refusal into a sentence that says what to do about it. */
function explain(result: Extract<ShelfWriteResult, { ok: false }>, name: string): CategoryResult {
  switch (result.error) {
    case "SLUG_TAKEN":
      return {
        ok: false,
        error: "Another shelf already uses that slug. Slugs are web addresses, so they must be unique.",
        fieldErrors: { slug: "Already taken. Try another." },
      };
    case "IN_USE":
      return {
        ok: false,
        error: `${name} still has pairs on it. Move them to another shelf first — including any drafts and archived ones, which keep their shelf too.`,
      };
    case "LAST_SHELF":
      return {
        ok: false,
        error: "This is the only shelf left. The shop needs one to browse by, so it cannot be deleted.",
      };
    case "NOT_FOUND":
      return { ok: false, error: "That shelf no longer exists." };
  }
}

/* ── Create ─────────────────────────────────────────────────────────────── */

export async function createCategoryAction(raw: unknown): Promise<CategoryResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = categoryCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention.", fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    const result = await createShelf(parsed.data);
    if (!result.ok) return explain(result, parsed.data.name);

    await recordActivity({
      adminId: auth.admin.id,
      action: "category.created",
      entityType: "category",
      entityId: result.slug,
      entityLabel: parsed.data.name,
      metadata: { slug: result.slug, enabled: parsed.data.enabled },
    });

    revalidateShelves(result.slug);

    return { ok: true, slug: result.slug, message: "Shelf added." };
  } catch (error) {
    console.error("[createCategoryAction]", error);
    return { ok: false, error: "Could not add the shelf. Nothing was changed — try again." };
  }
}

/* ── Edit ───────────────────────────────────────────────────────────────── */

export async function updateCategoryAction(raw: unknown): Promise<CategoryResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = categoryUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { slug, name, description, imageUrl, enabled } = parsed.data;

  /* Hiding the last visible shelf leaves the header's nav row and the home
     page's shelf tiles empty, which reads as a broken shop. */
  if (!enabled) {
    const current = await getShelf(slug);
    if (current?.enabled) {
      const live = await enabledShelfCount();
      if (live <= 1) {
        return {
          ok: false,
          error: "At least one shelf has to stay visible — hiding the last one leaves the shop with no way to browse.",
          fieldErrors: { enabled: "This is the only visible shelf." },
        };
      }
    }
  }

  try {
    const result = await updateShelf(slug, { name, description, imageUrl, enabled });
    if (!result.ok) return explain(result, name);

    await recordActivity({
      adminId: auth.admin.id,
      action: "category.updated",
      entityType: "category",
      entityId: slug,
      entityLabel: name,
      metadata: { slug, enabled },
    });

    revalidateShelves(slug);

    return { ok: true, slug, message: "Shelf saved." };
  } catch (error) {
    console.error("[updateCategoryAction]", error);
    return { ok: false, error: "Could not save. Nothing was changed — try again." };
  }
}

/* ── Show / hide ────────────────────────────────────────────────────────── */

export async function toggleCategoryAction(raw: unknown): Promise<CategoryResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = categoryToggleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That shelf is not valid." };

  const { slug, enabled } = parsed.data;

  try {
    const shelf = await getShelf(slug);
    if (!shelf) return { ok: false, error: "That shelf no longer exists." };

    /* Only a shelf that is currently visible can be the last visible one.
       Checking the count alone would refuse to hide an already-hidden shelf
       whenever one other shelf was left on — a no-op reported as an error. */
    if (!enabled && shelf.enabled) {
      const live = await enabledShelfCount();
      if (live <= 1) {
        return {
          ok: false,
          error: "At least one shelf has to stay visible — hiding the last one leaves the shop with no way to browse.",
        };
      }
    }

    const result = await setShelfEnabled(slug, enabled);
    if (!result.ok) return explain(result, shelf.name);

    await recordActivity({
      adminId: auth.admin.id,
      action: enabled ? "category.shown" : "category.hidden",
      entityType: "category",
      entityId: slug,
      entityLabel: shelf.name,
      metadata: { slug, enabled },
    });

    revalidateShelves(slug);

    return { ok: true, slug, message: enabled ? "Shelf is visible." : "Shelf hidden." };
  } catch (error) {
    console.error("[toggleCategoryAction]", error);
    return { ok: false, error: "Could not change that. Nothing was applied — try again." };
  }
}

/* ── Reorder ────────────────────────────────────────────────────────────── */

export async function reorderCategoriesAction(raw: unknown): Promise<CategoryResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = categoryReorderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That order is not valid." };

  try {
    await reorderShelves(parsed.data);

    await recordActivity({
      adminId: auth.admin.id,
      action: "category.reordered",
      entityType: "categories",
      entityLabel: "Shelves",
      metadata: { order: parsed.data },
    });

    revalidateShelves();

    return { ok: true, slug: parsed.data[0], message: "Order saved." };
  } catch (error) {
    console.error("[reorderCategoriesAction]", error);
    return { ok: false, error: "Could not save the order. Nothing was changed — try again." };
  }
}

/* ── Delete ─────────────────────────────────────────────────────────────── */

/**
 * Remove a shelf for good.
 *
 * Unlike a product, a shelf is not archived first: it has no public URL of its
 * own — it is a `?c=` filter value — so there is no link in a WhatsApp chat
 * that a deleted shelf would break. What it does have is pairs pointing at it,
 * and the repository refuses while any remain.
 */
export async function deleteCategoryAction(slug: string): Promise<CategoryResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  try {
    const shelf = await getShelf(slug);
    if (!shelf) return { ok: false, error: "That shelf no longer exists." };

    const result = await deleteShelf(slug);
    if (!result.ok) return explain(result, shelf.name);

    await recordActivity({
      adminId: auth.admin.id,
      action: "category.deleted",
      entityType: "category",
      entityId: slug,
      entityLabel: shelf.name,
      metadata: { slug },
    });

    revalidateShelves();

    return { ok: true, slug, message: `${shelf.name} deleted.` };
  } catch (error) {
    console.error("[deleteCategoryAction]", error);
    return { ok: false, error: "Could not delete that shelf. Nothing was changed — try again." };
  }
}
