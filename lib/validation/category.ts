import { z } from "zod";
import { MAX, RANGE, tooLong } from "@/lib/validation/limits";

import { SLUG_PATTERN } from "@/lib/catalogue";
import { isAllowedImageUrl } from "@/lib/validation/product";

/**
 * What a shelf has to look like to be saved.
 *
 * One definition, imported by the form, the server action and the write path,
 * so the three cannot disagree about what a valid shelf is.
 *
 * Shelves used to be a fixed list of four whose slugs were a TypeScript union.
 * They are ordinary rows now — the admin creates and deletes them — so the
 * rules that used to be enforced by the type system have to live here instead.
 */

/**
 * Slugs the shop cannot hand to a shelf.
 *
 * `new` is the one that actually bites: the admin edits a shelf at
 * /admin/categories/<slug> and creates one at /admin/categories/new, and
 * Next.js gives the static segment priority. A shelf slugged "new" would save
 * fine and then be permanently uneditable.
 *
 * The rest are reserved because they are already query values or route
 * segments the storefront reads.
 */
export const RESERVED_SLUGS = ["new", "all", "shop", "admin", "p", "about", "wishlist"] as const;

export const categorySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "A slug needs at least two characters.")
  .max(40, "Keep a slug under 40 characters — it is a web address, not a sentence.")
  .regex(
    SLUG_PATTERN,
    "Lowercase letters, numbers and single hyphens only — it goes straight into a web address.",
  )
  .refine((v) => !(RESERVED_SLUGS as readonly string[]).includes(v), {
    message: "That word is reserved by the shop and cannot be a shelf slug.",
  });

/** The fields a shelf carries, minus its identity. */
const shelfFields = {
  name: z.string().trim().min(1, "A shelf needs a name.").max(MAX.shelfName, tooLong(MAX.shelfName)),
  description: z.string().trim().max(300, "Keep a blurb to one sentence.").default(""),
  /**
   * The shelf's photograph.
   *
   * Held to the same allow-list as a product's. `next/image` refuses a host
   * that is not in `remotePatterns`, and it refuses it at render time on a
   * page that may already be prerendered — so a URL that would fail there has
   * to be refused here, before it can be saved. See the note in
   * next.config.ts; the two lists have to stay in step.
   */
  imageUrl: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .url("That is not a valid URL.")
        .refine(
          isAllowedImageUrl,
          "That image host is not allowed — upload the file to the media library and paste that link instead.",
        ),
    ])
    .nullish()
    .transform((v) => v || null),
  enabled: z.boolean().default(true),
};

/**
 * Creating a shelf. The slug is chosen once, here, and never again — see
 * `categoryUpdateSchema`.
 */
export const categoryCreateSchema = z.object({
  slug: categorySlugSchema,
  ...shelfFields,
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

/**
 * Editing a shelf.
 *
 * The slug is the identity and stays fixed. It is the primary key, the
 * `?c=` value in every header link, and the thing `products.category_slug`
 * points at — renaming it would break links already shared on WhatsApp and
 * silently re-shelve every pair. Rename the *name*; the slug is the address.
 */
export const categoryUpdateSchema = z.object({
  slug: categorySlugSchema,
  ...shelfFields,
  position: z.number().int().min(0).default(0),
});

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

/**
 * Reordering the shelves.
 *
 * Order is a property of the set rather than of any one row, so the whole list
 * is written together and positions are renumbered from the array's order.
 * The client never has to compute a position.
 */
export const categoryReorderSchema = z
  .array(categorySlugSchema)
  .min(1, "There has to be at least one shelf.");

/**
 * Turning a shelf off.
 *
 * At least one has to stay on: with every shelf hidden the header's nav row
 * and the home page's shelf tiles both render empty, which reads as a broken
 * shop rather than a deliberate one. Checked in the action, where the other
 * shelves' states are known.
 */
export const categoryToggleSchema = z.object({
  slug: categorySlugSchema,
  enabled: z.boolean(),
});

/** Suggest a slug from a shelf's name, the same way the product form does. */
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
