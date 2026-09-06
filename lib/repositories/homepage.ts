import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";

import type { Category } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { homepageProductSelections, homepageSections, products } from "@/lib/db/schema";
import {
  parseSectionConfig,
  type CategoryStoryConfig,
  type CollectionSpreadConfig,
  type HomepageSectionType,
} from "@/lib/validation/homepage";

/**
 * The home page's composition, read from the database.
 *
 * ── What the editor controls, and what stays in code ─────────────────────
 * Order, visibility, copy, which pairs a section shows, and how many. Nothing
 * else. There is no colour here, no font, no spacing, no column count — the
 * storefront's restrictions are what keep it from looking like a template,
 * and a settings screen that can undo them is a settings screen that
 * eventually will.
 *
 * ── Pinned pairs, with a fallback that is not a failure ──────────────────
 * A section with no explicit selection falls back to the query it always
 * used: featured pairs for the hero, the `isNew` flag for New in. That is not
 * an error path — it is how the page behaved before any of this existed, and
 * it means an editor who never opens the homepage screen still gets a
 * complete page.
 *
 * A pinned pair that has since been unpublished simply drops out and the
 * fallback fills the gap, so archiving a shoe can never leave a hole where a
 * photograph should be.
 */

export const HOMEPAGE_TAG = "homepage";

export type HomepageSection = {
  id: string;
  type: HomepageSectionType;
  title: string | null;
  description: string | null;
  enabled: boolean;
  position: number;
  itemLimit: number | null;
  config: Record<string, unknown>;
  /** Product slugs this section pins, in display order. */
  productSlugs: string[];
};

/* ── Reads ──────────────────────────────────────────────────────────────── */

async function loadSections(): Promise<HomepageSection[]> {
  const rows = await db.select().from(homepageSections).orderBy(asc(homepageSections.position));
  if (rows.length === 0) return [];

  /* One join for every section's pinned pairs rather than a query each. */
  const selections = await db
    .select({
      sectionId: homepageProductSelections.sectionId,
      slug: products.slug,
      position: homepageProductSelections.position,
    })
    .from(homepageProductSelections)
    .innerJoin(products, eq(products.id, homepageProductSelections.productId))
    .orderBy(asc(homepageProductSelections.position));

  const bySection = new Map<string, string[]>();
  for (const row of selections) {
    const list = bySection.get(row.sectionId) ?? [];
    list.push(row.slug);
    bySection.set(row.sectionId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    type: row.type as HomepageSectionType,
    title: row.title,
    description: row.description,
    enabled: row.enabled,
    position: row.position,
    itemLimit: row.itemLimit,
    config: (row.config ?? {}) as Record<string, unknown>,
    productSlugs: bySection.get(row.id) ?? [],
  }));
}

/**
 * Every section, including disabled ones. For the editor.
 *
 * Uncached on purpose — an editor who saves and does not immediately see the
 * change assumes the save failed.
 */
export const listHomepageSections = cache(loadSections);

/**
 * The enabled sections, in order. For the storefront.
 *
 * Cached under its own tag so publishing a product does not rebuild the
 * layout, and rearranging the layout does not rebuild the catalogue.
 */
const loadEnabled = unstable_cache(
  async (): Promise<HomepageSection[]> => (await loadSections()).filter((s) => s.enabled),
  ["homepage-layout"],
  { tags: [HOMEPAGE_TAG] },
);

export const getHomepageLayout = cache(loadEnabled);

/* ── Typed config helpers ───────────────────────────────────────────────── */

/**
 * Section settings, parsed and defaulted.
 *
 * A section saved before a config field existed still renders — the parse
 * falls back rather than throwing, because a missing eyebrow is not a reason
 * to take the home page down.
 */
export function categoryStoryConfigOf(
  section: HomepageSection,
  fallbackCategory: Category,
): CategoryStoryConfig {
  const parsed = parseSectionConfig("category_story", section.config);
  if (parsed.success) return parsed.data as CategoryStoryConfig;
  return { category: fallbackCategory, blurb: "", side: "left" };
}

export function collectionSpreadConfigOf(section: HomepageSection): CollectionSpreadConfig {
  const parsed = parseSectionConfig("collection_spread", section.config);
  if (parsed.success) return parsed.data as CollectionSpreadConfig;
  return { eyebrow: "", headline: "" };
}
