import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { aboutContent } from "@/lib/db/schema";

/**
 * The editable content that is not a product, not a shelf and not the home
 * page's order: the About page.
 *
 * Shop settings and SEO live in `lib/shop.ts`, because the storefront reads
 * them on every page and they were already there. This file holds what the
 * admin adds on top.
 */

export const ABOUT_TAG = "about-content";

/* ── About ──────────────────────────────────────────────────────────────── */

export type About = {
  headline: string;
  body: string;
  deliveryInfo: string;
  returnsInfo: string;
  hours: string;
  photographyNote: string;
  imageSlugs: string[];
};

/**
 * What the page said before any of it was editable.
 *
 * Every field falls back on its own rather than the row as a whole: an editor
 * who has rewritten the headline but not the returns line should get their
 * headline and the shipped returns line, not neither.
 */
export const ABOUT_FALLBACK: About = {
  headline: "Two people, a room, and a phone.",
  body: [
    "We buy small runs from makers we have met. Every pair is photographed in the room it ships from. Nothing here passes through a warehouse.",
    "Twelve pairs at a time. If a size is greyed out it is genuinely gone — we would rather show you an empty size than take an order we cannot fill.",
    "Pick a pair and a size. The button opens WhatsApp with the shoe, the size and the price already written. We confirm the fit and send payment details in the same chat.",
  ].join("\n\n"),
  deliveryInfo: "",
  returnsInfo: "",
  hours: "",
  photographyNote: "Every pair shot by us, in the box it ships in.",
  imageSlugs: [],
};

const loadAbout = unstable_cache(
  async (): Promise<About> => {
    const [row] = await db.select().from(aboutContent).limit(1);
    if (!row) return ABOUT_FALLBACK;

    return {
      headline: row.headline || ABOUT_FALLBACK.headline,
      body: row.body || ABOUT_FALLBACK.body,
      deliveryInfo: row.deliveryInfo,
      returnsInfo: row.returnsInfo,
      hours: row.hours,
      photographyNote: row.photographyNote || ABOUT_FALLBACK.photographyNote,
      imageSlugs: Array.isArray(row.imageSlugs) ? (row.imageSlugs as string[]) : [],
    };
  },
  ["about-content"],
  { tags: [ABOUT_TAG] },
);

/** For the storefront. Cached until an edit clears the tag. */
export const getAbout = cache(loadAbout);

/**
 * For the editor. Uncached, and NOT defaulted — the form has to show what is
 * actually stored, or an editor would see the fallback text, save it, and
 * silently turn a fallback into real content they now have to maintain.
 */
export async function getAboutForEditing(): Promise<About> {
  const [row] = await db.select().from(aboutContent).limit(1);
  if (!row) return { ...ABOUT_FALLBACK, headline: "", body: "", photographyNote: "" };

  return {
    headline: row.headline,
    body: row.body,
    deliveryInfo: row.deliveryInfo,
    returnsInfo: row.returnsInfo,
    hours: row.hours,
    photographyNote: row.photographyNote,
    imageSlugs: Array.isArray(row.imageSlugs) ? (row.imageSlugs as string[]) : [],
  };
}

/* ── Categories ─────────────────────────────────────────────────────────── */

/**
 * Shelves moved to lib/repositories/categories.ts when they stopped being four
 * fixed rows and became a collection the admin creates and deletes. This file
 * kept them while "editing a shelf" meant editing copy on a row that always
 * existed; it does not any more.
 */
export {
  CATEGORIES_TAG,
  getShelves,
  getAllShelves,
  listShelvesForEditing,
  getShelf,
  shelfUsage,
} from "@/lib/repositories/categories";

/**
 * How many published pairs sit on each shelf.
 *
 * Re-exported from the products repository rather than re-queried here: two
 * implementations of "count the published pairs" is one too many.
 */
export { countsByCategory } from "@/lib/repositories/products";
