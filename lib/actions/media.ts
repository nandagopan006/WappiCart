"use server";

import { revalidatePath } from "next/cache";

import { recordActivity } from "@/lib/activity";
import { requireAdminForAction } from "@/lib/auth";
import { countImageReferences, deleteStoredObject } from "@/lib/repositories/media";
import { ALLOWED_IMAGE_TYPES, EXTENSION_FOR_TYPE, MAX_UPLOAD_BYTES } from "@/lib/media-limits";
import { createAdminClient, PRODUCT_IMAGE_BUCKET } from "@/lib/supabase/admin";

/**
 * Uploading and removing product photographs.
 *
 * ── The service-role key is used here, so read the guards first ──────────
 * Storage writes need a key that bypasses row-level security. That key is
 * only ever reached after `requireAdminForAction()` has established the
 * caller is an admin — a Server Action is its own HTTP endpoint, so that
 * check is the only thing standing between an anonymous request and the
 * bucket.
 *
 * ── What is checked, and where ───────────────────────────────────────────
 * The bucket enforces its own 10MB and MIME limits, but a rejection there
 * arrives as an opaque storage error. Everything is checked here first so the
 * editor gets a sentence they can act on, and the bucket stays the backstop
 * rather than the interface.
 *
 * ── Filenames are never trusted ──────────────────────────────────────────
 * The stored path is built from the product reference, a timestamp and random
 * bytes. The original name is discarded entirely: it can contain `../`, a
 * null byte, a leading dot, or four hundred characters of Unicode, and none
 * of that belongs in a path this app constructs.
 */

export type UploadResult =
  | { ok: true; url: string; storagePath: string }
  | { ok: false; error: string };

export async function uploadProductImageAction(formData: FormData): Promise<UploadResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: "Your session has expired. Sign in again." };

  const file = formData.get("file");
  const productRef = String(formData.get("productRef") ?? "unassigned");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file was received. Try choosing it again." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      error: `That file is ${mb}MB. The limit is 10MB — export it a little smaller and try again.`,
    };
  }

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    /* HEIC gets its own sentence. It is what an iPhone shoots by default, it
       is the most likely rejection, and "unsupported type" would leave the
       editor with no idea what to do about it. */
    const heic = file.type === "image/heic" || file.type === "image/heif";
    return {
      ok: false,
      error: heic
        ? "iPhone HEIC photos cannot be resized by the shop. Set Camera → Formats → Most Compatible, or export as JPEG."
        : "That file type is not allowed. Use JPEG, PNG, WebP or AVIF.",
    };
  }

  /* Built here, never from the uploaded filename. */
  const safeRef = /^[a-z0-9-]+$/.test(productRef) ? productRef : "unassigned";
  const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const storagePath = `products/${safeRef}/${unique}.${EXTENSION_FOR_TYPE[file.type]}`;

  try {
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        /* Never overwrite. The path carries random bytes, so a collision means
           something is wrong rather than that a retry is needed. */
        upsert: false,
        cacheControl: "31536000",
      });

    if (error) {
      console.error("[uploadProductImageAction]", error);
      return {
        ok: false,
        error: "The upload did not complete. Check your connection and try again.",
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);

    await recordActivity({
      adminId: auth.admin.id,
      action: "product.image.uploaded",
      entityType: "image",
      entityId: storagePath,
      entityLabel: safeRef,
      metadata: { bytes: file.size, type: file.type },
    });

    return { ok: true, url: publicUrl, storagePath };
  } catch (error) {
    console.error("[uploadProductImageAction]", error);
    return { ok: false, error: "The upload did not complete. Try again." };
  }
}

export type DeleteResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Remove a stored file.
 *
 * Refuses while anything still points at it. A product's photograph vanishing
 * because somebody tidied the media library is a broken shop page, and the
 * check costs one indexed query.
 */
export async function deleteStoredImageAction(storagePath: string): Promise<DeleteResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return { ok: false, error: "Your session has expired. Sign in again." };

  try {
    const references = await countImageReferences(storagePath);

    if (references.count > 0) {
      const names = references.products.slice(0, 3).join(", ");
      const more =
        references.products.length > 3 ? ` and ${references.products.length - 3} more` : "";
      return {
        ok: false,
        error: `Still used by ${names}${more}. Remove it from ${
          references.count === 1 ? "that product" : "those products"
        } first.`,
      };
    }

    const removed = await deleteStoredObject(storagePath);
    if (!removed.ok) return { ok: false, error: removed.error };

    await recordActivity({
      adminId: auth.admin.id,
      action: "product.image.deleted",
      entityType: "image",
      entityId: storagePath,
      entityLabel: storagePath.split("/").pop() ?? storagePath,
    });

    revalidatePath("/admin/media");
    return { ok: true, message: "Deleted." };
  } catch (error) {
    console.error("[deleteStoredImageAction]", error);
    return { ok: false, error: "Could not delete that file. Try again." };
  }
}
