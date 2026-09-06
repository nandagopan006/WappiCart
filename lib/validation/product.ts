import { z } from "zod";

import { SIZE_RUN, SLUG_PATTERN } from "@/lib/catalogue";
import { MAX, RANGE, rupees, tooLong } from "@/lib/validation/limits";

/**
 * The rules a product must follow. Written once, used everywhere.
 *
 * The same rules run in four places, all importing from this file:
 *   1. the admin form      - shows the message next to the field
 *   2. the server action   - never trust the browser
 *   3. the database        - unique slug and SKU, price > 0, and so on
 *   4. reading the shop    - a bad row is hidden rather than rendered
 *
 * Two levels of strictness:
 *   productDraftSchema       - for saving. Fields may be empty.
 *   productPublishableSchema - for publishing. Everything required.
 *
 * That split is what lets someone start a product today and finish it next
 * week without fighting the form.
 */

/* ── Field rules ────────────────────────────────────────────────────────── */

const slug = z
  .string()
  .trim()
  .min(1, "Slug is required — it becomes the product's web address.")
  .max(MAX.slug, tooLong(MAX.slug))
  .regex(/^[a-z0-9-]+$/, "Slug can only use lowercase letters, numbers and dashes.");

const sku = z
  .string()
  .trim()
  .min(1, "SKU is required — it goes into the WhatsApp order message.")
  .max(MAX.sku, tooLong(MAX.sku));

const price = z
  .number({ message: "Price must be a number." })
  .int("Price must be a whole number of rupees — the shop does not show paise.")
  .min(RANGE.price.min, "Price must be more than zero.")
  .max(RANGE.price.max, `That looks like a typo — the most this form takes is ${rupees(RANGE.price.max)}.`);

const mrp = z
  .number({ message: "MRP must be a number." })
  .int("MRP must be a whole number of rupees.")
  .min(RANGE.price.min, "MRP must be more than zero.")
  .max(RANGE.price.max, `That looks like a typo — the most this form takes is ${rupees(RANGE.price.max)}.`)
  .nullish();

/**
 * Which image addresses are allowed.
 *
 * Must match the `remotePatterns` list in next.config.ts. If they disagree, an
 * image saves fine and then fails to load on the live site.
 */
export function isAllowedImageUrl(value: string): boolean {
  /* A file the project serves itself, out of /public. */
  if (value.startsWith("/")) return true;

  /* The stand-in photography. Goes when the shop shoots its own stock. */
  if (value.startsWith("https://images.unsplash.com/photo-")) return true;

  /* Supabase Storage, which is where admin uploads land. Derived from the
     project URL rather than hardcoded, so a different Supabase project does
     not need a code change. */
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabase && value.startsWith(`${supabase.replace(/\/$/, "")}/storage/v1/object/public/`)) {
    return true;
  }

  return false;
}

const imageUrl = z
  .string()
  .trim()
  .min(1, "An image needs a URL.")
  .max(MAX.url, tooLong(MAX.url))
  .refine(isAllowedImageUrl, "That image host is not allowed — upload the file instead of pasting a link.");

/**
 * The description read aloud by screen readers.
 *
 * At least 20 characters, which is what stops "product image" or "shoe"
 * getting through.
 */
const alt = z
  .string()
  .trim()
  .min(20, "Alt text must describe the shoe — colour, material, angle. At least 20 characters.")
  .max(MAX.altText, tooLong(MAX.altText));

const size = z
  .number()
  .int()
  .refine(
    (n) => (SIZE_RUN as readonly number[]).includes(n),
    `Size must be one of ${SIZE_RUN.join(", ")}.`,
  );

export const productImageSchema = z.object({
  id: z.string().uuid().optional(),
  url: imageUrl,
  alt,
  storagePath: z.string().nullish(),
});

export type ProductImageInput = z.infer<typeof productImageSchema>;

/* ── The draft form ─────────────────────────────────────────────────────── */

/**
 * For saving a product.
 *
 * Broken things are still rejected — a slug that cannot be a web address, a
 * negative price, a size the shop does not sell. Merely *unfinished* things
 * are allowed: an empty description is a draft, not a mistake.
 */
export const productDraftSchema = z
  .object({
    slug,
    name: z.string().trim().min(1, "Every pair needs a name.").max(MAX.productName, tooLong(MAX.productName)),
    /* A slug's shape, not its membership. The shelves live in the database
       and can be created and deleted from the admin, so the list is not known
       here; the `category_slug` foreign key is what rejects one that does not
       exist, and the action turns that into a field error. */
    categorySlug: z.string().trim().regex(SLUG_PATTERN, "Pick a shelf for this pair."),
    price,
    mrp,
    colour: z.string().trim().max(MAX.colour, tooLong(MAX.colour)).default(""),
    material: z.string().trim().max(MAX.material, tooLong(MAX.material)).default(""),
    fitNote: z.string().trim().max(MAX.fitNote, tooLong(MAX.fitNote)).nullish(),
    description: z.string().trim().max(MAX.description, tooLong(MAX.description)).default(""),
    care: z.string().trim().max(MAX.care, tooLong(MAX.care)).default(""),
    sku,
    featured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    seoTitle: z.string().trim().max(MAX.seoTitle, tooLong(MAX.seoTitle)).nullish(),
    seoDescription: z.string().trim().max(MAX.seoDescription, tooLong(MAX.seoDescription)).nullish(),
    seoImageUrl: z.string().trim().max(MAX.url, tooLong(MAX.url)).nullish(),
    /* Order is the array's own order — position 0 is the side profile the
       grid, the hero and the OG card all use. */
    images: z
      .array(productImageSchema)
      .max(RANGE.images.max, `A pair can carry at most ${RANGE.images.max} photographs.`),
    sizes: z.array(size),
  })
  .refine((v) => v.mrp == null || v.mrp > v.price, {
    message: "MRP must be higher than the price, or left empty. An MRP at or below the price is not a discount.",
    path: ["mrp"],
  })
  .refine((v) => new Set(v.sizes).size === v.sizes.length, {
    message: "That size is listed twice.",
    path: ["sizes"],
  });

export type ProductDraftInput = z.input<typeof productDraftSchema>;
export type ProductDraft = z.infer<typeof productDraftSchema>;

/* ── The publish contract ───────────────────────────────────────────────── */

/**
 * For publishing. Everything a shopper needs must be filled in.
 *
 * Reports every problem at once rather than one at a time.
 *
 * Slug and SKU uniqueness is NOT checked here — that needs the database, so
 * the action does it.
 */
export const productPublishableSchema = productDraftSchema.superRefine((v, ctx) => {
  const required = [
    ["colour", v.colour, "Colour is missing — one or two words, matching the photograph."],
    ["material", v.material, "Material is what the shopper asks about first."],
    ["description", v.description, "Description is missing — two or three short sentences."],
    ["care", v.care, "Care is missing — one or two plain sentences."],
  ] as const;

  for (const [path, value, message] of required) {
    if (!value || value.trim().length === 0) {
      ctx.addIssue({ code: "custom", path: [path], message });
    }
  }

  if (v.images.length < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["images"],
      message: "A published pair needs 2 to 4 photographs. The first is the side profile.",
    });
  }

  if (v.sizes.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["sizes"],
      message:
        "No sizes left. Archive the pair rather than publishing it with nothing a shopper can order.",
    });
  }
});

export type PublishableProduct = z.infer<typeof productPublishableSchema>;

/* ── The storefront boundary ────────────────────────────────────────────── */

/**
 * Checked when the shop *reads* a product, not when the admin writes one.
 *
 * Catches rows that got into the database some other way — edited by hand in
 * Supabase, say — before they reach a shopper.
 */
export const storefrontProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: z.string().regex(SLUG_PATTERN),
  price: z.number().int().positive(),
  mrp: z.number().int().positive().optional(),
  images: z.array(z.string().min(1)).min(2).max(4),
  image: z.string().min(1),
  alt: z.string().min(20),
  sizes: z.array(size).min(1),
  colour: z.string().min(1),
  material: z.string().min(1),
  fitNote: z.string().optional(),
  description: z.string().min(1),
  care: z.string().min(1),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  sku: z.string().min(1),
});

/* ── Turning issues into something a form can render ────────────────────── */

/** Turns validation errors into { fieldName: "message" } for the form. */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    /* Nested fields become "images.1.alt". Errors with no field go to
       "_form" and show at the top. */
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    errors[key] ??= issue.message;
  }

  return errors;
}
