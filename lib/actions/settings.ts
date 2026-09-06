"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { recordActivity } from "@/lib/activity";
import { requireAdminForAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { aboutContent, seoSettings, shopSettings } from "@/lib/db/schema";
import { ABOUT_TAG } from "@/lib/repositories/settings";
import { SHOP_SETTINGS_TAG } from "@/lib/shop";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/product";
import {
  aboutContentSchema,
  seoSettingsSchema,
  shopSettingsSchema,
} from "@/lib/validation/settings";

/**
 * The shop's settings, its SEO, and the About page.
 *
 * All three follow the pipeline every mutation in this app follows:
 * authenticate, validate, write, log, revalidate, return a typed result. The
 * auth check is not a duplicate of the layout's — a Server Action is its own
 * HTTP endpoint and can be called without ever loading the page.
 */

export type SettingsResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

const UNAUTHORISED: SettingsResult = {
  ok: false,
  error: "Your session has expired. Sign in again.",
};

/* ── Shop settings ──────────────────────────────────────────────────────── */

/**
 * Changing these changes every page.
 *
 * The shop's name is in the wordmark and the page title; the phone number is
 * in every order button; the site URL is in every canonical tag, the sitemap,
 * and the product link inside each WhatsApp message. So the revalidation is
 * broad on purpose — a narrow one here would leave half the site quoting the
 * old number.
 */
export async function saveShopSettingsAction(raw: unknown): Promise<SettingsResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = shopSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await db
      .insert(shopSettings)
      .values({ id: 1, ...parsed.data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: shopSettings.id,
        set: { ...parsed.data, updatedAt: new Date() },
      });

    await recordActivity({
      adminId: auth.admin.id,
      action: "settings.updated",
      entityType: "shop_settings",
      entityLabel: parsed.data.name,
      /* The phone number is deliberately not logged. It is not a secret, but
         an audit trail is not the place to accumulate the shop's contact
         details in plain text. */
      metadata: { changed: Object.keys(parsed.data).length },
    });

    revalidateTag(SHOP_SETTINGS_TAG);
    for (const path of ["/", "/shop", "/about", "/wishlist", "/sitemap.xml", "/robots.txt"]) {
      revalidatePath(path);
    }
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/admin/settings");

    return { ok: true, message: "Shop settings saved." };
  } catch (error) {
    console.error("[saveShopSettingsAction]", error);
    return { ok: false, error: "Could not save. Nothing was changed — try again." };
  }
}

/* ── SEO ────────────────────────────────────────────────────────────────── */

export async function saveSeoSettingsAction(raw: unknown): Promise<SettingsResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = seoSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const values = { ...parsed.data, ogImageUrl: parsed.data.ogImageUrl || null };

    await db
      .insert(seoSettings)
      .values({ id: 1, ...values, updatedAt: new Date() })
      .onConflictDoUpdate({ target: seoSettings.id, set: { ...values, updatedAt: new Date() } });

    await recordActivity({
      adminId: auth.admin.id,
      action: "seo.updated",
      entityType: "seo_settings",
      entityLabel: "Site SEO",
    });

    /* SEO lives in the same cached read as the shop settings. */
    revalidateTag(SHOP_SETTINGS_TAG);
    for (const path of ["/", "/shop", "/about", "/admin/seo"]) revalidatePath(path);

    return { ok: true, message: "SEO saved." };
  } catch (error) {
    console.error("[saveSeoSettingsAction]", error);
    return { ok: false, error: "Could not save. Nothing was changed — try again." };
  }
}

/* ── About ──────────────────────────────────────────────────────────────── */

export async function saveAboutAction(raw: unknown): Promise<SettingsResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return UNAUTHORISED;

  const parsed = aboutContentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await db
      .insert(aboutContent)
      .values({ id: 1, ...parsed.data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: aboutContent.id,
        set: { ...parsed.data, updatedAt: new Date() },
      });

    await recordActivity({
      adminId: auth.admin.id,
      action: "about.updated",
      entityType: "about_content",
      entityLabel: "About page",
    });

    revalidateTag(ABOUT_TAG);
    revalidatePath("/about");
    revalidatePath("/admin/about");

    return { ok: true, message: "About page saved." };
  } catch (error) {
    console.error("[saveAboutAction]", error);
    return { ok: false, error: "Could not save. Nothing was changed — try again." };
  }
}

/* ── Categories ─────────────────────────────────────────────────────────── */

/**
 * Shelves are their own collection now — created, reordered and deleted — so
 * their actions live in lib/actions/categories.ts. Saving all four at once
 * from this file made sense while there were always exactly four.
 */
