import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { seoSettings, shopSettings } from "@/lib/db/schema";

/**
 * The shop's own details: name, phone number, delivery areas, returns policy.
 *
 * These live in the database so the owner can change them at /admin/settings
 * without a developer. Editing .env.local will NOT change them.
 *
 * Because it reads the database, every function here is async and server-only.
 * Browser components (OrderButton, Catalog) get the phone number passed down
 * as a prop instead.
 *
 * If the settings row is missing — a brand new database — every field falls
 * back to a sensible default, so the site still looks right.
 */

export type Shop = {
  name: string;
  tagline: string;
  /** Country code + number, digits only. wa.me rejects anything else. */
  phone: string;
  instagram: string;
  instagramHandle: string;
  deliveryAreas: string;
  returnWindow: string;
  replyTime: string;
  /** Canonical URLs, sitemap and OG tags. No trailing slash. */
  url: string;
};

export type Seo = {
  siteTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
};

/**
 * The brand name, as a plain constant.
 *
 * Only used by the share-image files, which need a fixed value that cannot be
 * awaited. Everything else reads the live database row.
 */
export const BRAND_FALLBACK = {
  name: "WappiCart",
  tagline: "Shoes that arrive in a conversation.",
} as const;

/** What the shop was before the database existed. Still the safety net. */
const FALLBACK_SHOP: Shop = {
  name: "WappiCart",
  tagline: "Shoes that arrive in a conversation.",
  phone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "919000000000",
  instagram: "https://instagram.com/wappicart",
  instagramHandle: "@wappicart",
  deliveryAreas: "Kochi, Thrissur and Kozhikode in 2 days. Rest of India in 4–6.",
  returnWindow: "7 days, unworn, box intact.",
  replyTime: "We reply in about an hour, 9am to 9pm.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wappicart.vercel.app").replace(/\/$/, ""),
};

const FALLBACK_SEO: Seo = {
  siteTitle: `${FALLBACK_SHOP.name} — ${FALLBACK_SHOP.tagline}`,
  metaDescription:
    "A small shoe shop. Browse the pairs here, order the one you want on WhatsApp. No cart, no checkout form, no account.",
  ogTitle: `${FALLBACK_SHOP.name} — ${FALLBACK_SHOP.tagline}`,
  ogDescription: "Browse the pairs here, order on WhatsApp.",
  ogImageUrl: null,
};

/** The tag every settings read is stored under, so one edit clears one thing. */
export const SHOP_SETTINGS_TAG = "shop-settings";

const read = unstable_cache(
  async (): Promise<{ shop: Shop; seo: Seo }> => {
    /* Sequential, like every other pair of queries in this project. */
    const [shopRow] = await db.select().from(shopSettings).limit(1);
    const [seoRow] = await db.select().from(seoSettings).limit(1);

    const shop: Shop = shopRow
      ? {
          name: shopRow.name,
          tagline: shopRow.tagline,
          phone: shopRow.whatsappPhone,
          instagram: shopRow.instagram,
          instagramHandle: shopRow.instagramHandle,
          deliveryAreas: shopRow.deliveryAreas,
          returnWindow: shopRow.returnWindow,
          replyTime: shopRow.replyTime,
          url: shopRow.siteUrl.replace(/\/$/, ""),
        }
      : FALLBACK_SHOP;

    const seo: Seo = seoRow
      ? {
          /* Each field falls back on its own, so filling in one and leaving
             another blank still works. */
          siteTitle: seoRow.siteTitle || `${shop.name} — ${shop.tagline}`,
          metaDescription: seoRow.metaDescription || FALLBACK_SEO.metaDescription,
          ogTitle: seoRow.ogTitle || seoRow.siteTitle || `${shop.name} — ${shop.tagline}`,
          ogDescription: seoRow.ogDescription || seoRow.metaDescription || FALLBACK_SEO.ogDescription,
          ogImageUrl: seoRow.ogImageUrl,
        }
      : FALLBACK_SEO;

    return { shop, seo };
  },
  ["shop-settings"],
  { tags: [SHOP_SETTINGS_TAG] },
);

/** The shop and its SEO, in one cached read. */
export const getShopSettings = cache(read);

/** Convenience for the many callers that only want the shop. */
export async function getShop(): Promise<Shop> {
  return (await getShopSettings()).shop;
}
