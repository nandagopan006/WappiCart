import { z } from "zod";
import { MAX, RANGE, tooLong } from "@/lib/validation/limits";

import { SLUG_PATTERN } from "@/lib/catalogue";

/**
 * The home page's composition, as a validated shape.
 *
 * ── What the admin controls, and what it must not ────────────────────────
 * Order, visibility, copy, which pairs each section shows, and how many.
 * That is the whole list. There is no field here for a colour, a font, a
 * spacing value, a corner radius or a column count, and adding one would be
 * a mistake rather than a feature: the storefront's restrictions are what
 * keep it from looking like a template, and a settings screen that can undo
 * them is a settings screen that eventually will.
 *
 * ── Why `config` is jsonb with a schema in front of it ───────────────────
 * A category story needs to know which shelf it points at; a collection
 * spread needs an eyebrow and a headline; a brand statement needs neither.
 * Eight nullable columns, each meaningful to one section type and dead weight
 * to the other seven, is worse than one typed blob — as long as the type is
 * enforced somewhere, which is what this file is.
 */

/** The section vocabulary, matching both the pg enum and the components. */
export const HOMEPAGE_SECTION_TYPES = [
  "hero",
  "new_in",
  "category_story",
  "product_story",
  "collection_spread",
  "category_tiles",
  "brand_statement",
  "order_block",
] as const;

export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

/** How each section reads in the admin's section list. */
export const SECTION_LABELS: Record<HomepageSectionType, string> = {
  hero: "Hero",
  new_in: "New in",
  category_story: "Category story",
  product_story: "Product story",
  collection_spread: "Collection spread",
  category_tiles: "Shop by shelf",
  brand_statement: "Brand statement",
  order_block: "Order block",
};

/**
 * How many pairs each section can show, and whether that is even a choice.
 *
 * The bounds are layout facts, not preferences: the collection spread is a
 * three-up editorial composition and a fourth pair has nowhere to go, and
 * "New in" runs the three-column grid so its count wants to stay a multiple
 * the last row can fill. `null` means the section shows no product list.
 */
export const SECTION_ITEM_LIMITS: Record<HomepageSectionType, { min: number; max: number } | null> = {
  hero: { min: 1, max: 1 },
  new_in: { min: 2, max: 8 },
  category_story: { min: 1, max: 3 },
  product_story: { min: 1, max: 1 },
  collection_spread: { min: 3, max: 3 },
  category_tiles: null,
  brand_statement: null,
  order_block: null,
};

/* ── Per-type config ────────────────────────────────────────────────────── */

const categoryStoryConfig = z.object({
  /* Shelves are rows now, so this is a slug's shape rather than a fixed
     list. A story pointing at a deleted shelf falls back to the first one —
     see categoryStoryConfigOf in lib/repositories/homepage.ts. */
  category: z.string().regex(SLUG_PATTERN),
  /** One sentence: what the shoe is, no adjectives for sale. */
  blurb: z.string().trim().max(MAX.shelfBlurb, tooLong(MAX.shelfBlurb)).default(""),
  /** Which side the photograph sits on. Never the same shape twice in a row. */
  side: z.enum(["left", "right"]).default("left"),
});

const collectionSpreadConfig = z.object({
  eyebrow: z.string().trim().max(MAX.eyebrow, tooLong(MAX.eyebrow)).default(""),
  headline: z.string().trim().max(MAX.headline, tooLong(MAX.headline)).default(""),
});

/**
 * Config is validated per section type and defaults to `{}` for the types
 * that carry none, so a section saved before a config field existed still
 * loads rather than throwing.
 */
export function parseSectionConfig(type: HomepageSectionType, value: unknown) {
  switch (type) {
    case "category_story":
      return categoryStoryConfig.safeParse(value ?? {});
    case "collection_spread":
      return collectionSpreadConfig.safeParse(value ?? {});
    default:
      return z.object({}).loose().safeParse(value ?? {});
  }
}

export type CategoryStoryConfig = z.infer<typeof categoryStoryConfig>;
export type CollectionSpreadConfig = z.infer<typeof collectionSpreadConfig>;

/* ── A section ──────────────────────────────────────────────────────────── */

export const homepageSectionSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(HOMEPAGE_SECTION_TYPES),
    /* Null means "use the copy the component ships with", so an editor who
       has never opened this screen still gets the page as designed. */
    title: z.string().trim().max(MAX.sectionTitle, tooLong(MAX.sectionTitle)).nullish(),
    description: z.string().trim().max(MAX.sectionDescription, tooLong(MAX.sectionDescription)).nullish(),
    enabled: z.boolean(),
    position: z.number().int().min(RANGE.position.min).max(RANGE.position.max),
    itemLimit: z.number().int().min(RANGE.itemLimit.min).max(RANGE.itemLimit.max).nullish(),
    config: z.unknown().default({}),
    /* Product slugs this section pins, in display order. Empty means "fall
       back to the query this section always used" — featured pairs for the
       hero, the isNew flag for New in — so an unconfigured page is still a
       complete one. */
    productSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  })
  .superRefine((section, ctx) => {
    const bounds = SECTION_ITEM_LIMITS[section.type];

    if (bounds && section.itemLimit != null) {
      if (section.itemLimit < bounds.min || section.itemLimit > bounds.max) {
        ctx.addIssue({
          code: "custom",
          path: ["itemLimit"],
          message: `${SECTION_LABELS[section.type]} shows between ${bounds.min} and ${bounds.max} pairs.`,
        });
      }
    }

    if (bounds && section.productSlugs.length > bounds.max) {
      ctx.addIssue({
        code: "custom",
        path: ["productSlugs"],
        message: `${SECTION_LABELS[section.type]} holds at most ${bounds.max}.`,
      });
    }

    const config = parseSectionConfig(section.type, section.config);
    if (!config.success) {
      ctx.addIssue({
        code: "custom",
        path: ["config"],
        message: config.error.issues[0]?.message ?? "That section's settings are not valid.",
      });
    }
  });

export type HomepageSectionInput = z.infer<typeof homepageSectionSchema>;

/**
 * The whole page in one save.
 *
 * Ordering is validated across the set rather than per row, because two
 * sections claiming position 3 is a property of the list, not of either
 * section — and the database's unique constraint on `position` would
 * otherwise reject the save with an error no editor could act on.
 */
export const homepageLayoutSchema = z
  .array(homepageSectionSchema)
  .min(1, "The home page needs at least one section.")
  .superRefine((sections, ctx) => {
    const positions = sections.map((s) => s.position);
    if (new Set(positions).size !== positions.length) {
      ctx.addIssue({ code: "custom", message: "Two sections claim the same position." });
    }

    if (!sections.some((s) => s.enabled)) {
      ctx.addIssue({
        code: "custom",
        message: "At least one section has to stay on — a home page with everything disabled is a blank page.",
      });
    }
  });

export type HomepageLayoutInput = z.infer<typeof homepageLayoutSchema>;

/**
 * The first thing wrong with a layout, as one sentence.
 *
 * The homepage editor saves the whole page at once, so a map of field-to-
 * message has nowhere to render — there is no single control to hang it on.
 * One clear sentence naming the section is more useful than a list of paths
 * the editor cannot click.
 */
export function toFieldErrorsOf(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "That layout is not valid.";

  /* Path shapes: [] for a whole-list rule, [index, field] for one section. */
  const index = typeof issue.path[0] === "number" ? issue.path[0] : null;
  const where = index === null ? "" : `Section ${index + 1}: `;

  return `${where}${issue.message}`;
}
