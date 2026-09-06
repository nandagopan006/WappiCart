import { z } from "zod";
import { MAX, RANGE, tooLong } from "@/lib/validation/limits";

/**
 * Everything the admin can edit that is not a product.
 *
 * Same principle as lib/validation/product.ts: one definition, imported by the
 * form, the server action and the write path, so the three cannot disagree
 * about what a valid setting is.
 */

/* ── Shop settings ──────────────────────────────────────────────────────── */

/**
 * The WhatsApp number.
 *
 * Country code plus digits, nothing else. `wa.me` rejects a `+`, a space or a
 * dash, and this is the only conversion path on the site — a number saved
 * with a stray dash breaks every order button at once. The form strips
 * formatting rather than refusing it, because "+91 90000 00000" is how a
 * person writes a phone number and it would be rude to make them fix it by
 * hand.
 */
export const whatsappPhoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(
    z
      .string()
      .min(8, "That number looks too short. Use the country code and the number, e.g. 919000000000.")
      .max(15, "That number looks too long. Use the country code and the number, e.g. 919000000000.")
      .regex(/^[0-9]+$/, "Digits only — wa.me rejects anything else."),
  );

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(1, "The shop needs a name.").max(MAX.shopName, tooLong(MAX.shopName)),
  tagline: z
    .string()
    .trim()
    .min(1, "The tagline sits under the wordmark and in the page title.")
    .max(MAX.tagline, tooLong(MAX.tagline)),
  whatsappPhone: whatsappPhoneSchema,
  instagram: z.union([z.literal(""), z.string().trim().url("That is not a valid URL.")]).default(""),
  instagramHandle: z.string().trim().max(MAX.handle, tooLong(MAX.handle)).default(""),
  deliveryAreas: z.string().trim().max(MAX.promise, tooLong(MAX.promise)).default(""),
  returnWindow: z.string().trim().max(MAX.promise, tooLong(MAX.promise)).default(""),
  replyTime: z.string().trim().max(MAX.promise, tooLong(MAX.promise)).default(""),
  /* Canonical URLs, the sitemap, OG tags, and the product link inside every
     WhatsApp message are all built from this. A trailing slash would double
     up in every one of them. */
  siteUrl: z
    .string()
    .trim()
    .url("The site URL must be a full address, e.g. https://wappicart.com")
    .refine((v) => !v.endsWith("/"), "No trailing slash — it doubles up in every generated link."),
});

export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;

/* ── SEO ────────────────────────────────────────────────────────────────── */

/**
 * Length limits are advisory in the form rather than enforced here: Google
 * truncates a long title, which is a soft failure, and refusing to save one
 * would be the admin panel having an opinion the search engine does not.
 */
export const seoSettingsSchema = z.object({
  siteTitle: z.string().trim().max(MAX.seoTitle, tooLong(MAX.seoTitle)).default(""),
  metaDescription: z.string().trim().max(MAX.seoDescription, tooLong(MAX.seoDescription)).default(""),
  ogTitle: z.string().trim().max(MAX.seoTitle, tooLong(MAX.seoTitle)).default(""),
  ogDescription: z.string().trim().max(MAX.seoDescription, tooLong(MAX.seoDescription)).default(""),
  ogImageUrl: z.string().trim().max(MAX.url, tooLong(MAX.url)).nullish(),
});

export type SeoSettingsInput = z.infer<typeof seoSettingsSchema>;

/** Guidance the form renders as a counter, not as a validation error. */
export const SEO_LIMITS = {
  siteTitle: 60,
  metaDescription: 160,
  ogTitle: 60,
  ogDescription: 200,
} as const;

/* ── About ──────────────────────────────────────────────────────────────── */

/**
 * The About page's content.
 *
 * The page's job is to make somebody trust a shop with no cart, which it does
 * by being factual and short. The admin edits the facts; the layout — one
 * portrait, the prose, the table — stays in the component.
 */
export const aboutContentSchema = z.object({
  headline: z.string().trim().max(MAX.aboutHeadline, tooLong(MAX.aboutHeadline)).default(""),
  body: z.string().trim().max(MAX.aboutBody, tooLong(MAX.aboutBody)).default(""),
  deliveryInfo: z.string().trim().max(MAX.aboutFact, tooLong(MAX.aboutFact)).default(""),
  returnsInfo: z.string().trim().max(MAX.aboutFact, tooLong(MAX.aboutFact)).default(""),
  hours: z.string().trim().max(MAX.aboutFact, tooLong(MAX.aboutFact)).default(""),
  photographyNote: z.string().trim().max(MAX.aboutFact, tooLong(MAX.aboutFact)).default(""),
  /* The page's plate photographs, chosen from real stock by slug — About has
     never shipped its own art. */
  imageSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(4).default([]),
});

export type AboutContentInput = z.infer<typeof aboutContentSchema>;

/* ── Categories ─────────────────────────────────────────────────────────── */

/*
 * Shelf rules live in lib/validation/category.ts. They were here while a shelf
 * was a settings field on a row that always existed; they are a collection's
 * rules now — create, delete, reserved slugs — and importing them from
 * "settings" would only hide where they are.
 */
