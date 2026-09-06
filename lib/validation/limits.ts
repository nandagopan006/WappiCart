/**
 * How long and how large every field is allowed to be.
 *
 * ── Why limits exist at all ──────────────────────────────────────────────
 * Not to be strict for its own sake. Three real reasons:
 *
 * 1. A pasted paragraph in a product name breaks the layout. The grid caption
 *    is one line; 500 characters is not one line.
 * 2. Numbers have a hard ceiling in the database. `price` is a 32-bit
 *    integer, so anything past ~2.1 billion is rejected by Postgres with an
 *    error no shopkeeper could act on. Catching it here means the message
 *    says which field and why.
 * 3. Every unbounded text box is a place someone can paste a megabyte.
 *
 * ── The numbers are generous on purpose ──────────────────────────────────
 * Each one is far above what a real entry needs, so an honest typist never
 * meets them. They are a net for mistakes, not an opinion about writing.
 *
 * Keeping them here means the form, the server and the tests all quote the
 * same figure, and changing one changes it everywhere.
 */

/** Text lengths, in characters. */
export const MAX = {
  /* ── Product ─────────────────────────────────────────────── */
  /** Shown under every photograph, on one line. */
  productName: 120,
  /** Becomes the web address. */
  slug: 80,
  /** Goes into the WhatsApp message. */
  sku: 40,
  /** "Off-white", "Oxblood" — one or two words. */
  colour: 60,
  /** "Full-grain leather upper, rubber cup sole". */
  material: 200,
  /** "Runs half a size small". */
  fitNote: 200,
  /** Two or three sentences. The cap allows far more. */
  description: 2_000,
  /** One or two plain sentences. */
  care: 600,
  /** Read aloud by screen readers. Minimum 20, see product.ts. */
  altText: 300,

  /* ── Search and sharing ──────────────────────────────────── */
  seoTitle: 120,
  seoDescription: 400,
  /** A pasted image address. */
  url: 500,

  /* ── Shelves ─────────────────────────────────────────────── */
  shelfName: 60,
  shelfBlurb: 300,

  /* ── Home page ───────────────────────────────────────────── */
  sectionTitle: 80,
  sectionDescription: 300,
  eyebrow: 80,
  headline: 240,

  /* ── The shop's own details ──────────────────────────────── */
  shopName: 60,
  tagline: 140,
  handle: 60,
  /** Delivery areas, return window, reply time. */
  promise: 400,

  /* ── About page ──────────────────────────────────────────── */
  aboutHeadline: 160,
  aboutBody: 5_000,
  aboutFact: 400,
} as const;

/** Numbers, and the range each one may sit in. */
export const RANGE = {
  /**
   * Rupees. Ten lakh is far above any shoe this shop sells, and far below
   * the 2,147,483,647 ceiling of the database column — so a typo is caught
   * by the form with a readable message rather than by Postgres with an
   * unreadable one.
   */
  price: { min: 1, max: 1_000_000 },

  /** Sizes the shop stocks. Matches SIZE_RUN in lib/catalogue.ts. */
  size: { min: 6, max: 11 },

  /** Photographs per pair. The first is the side profile. */
  images: { min: 0, max: 4 },

  /** Where a shelf or a home page block sits in its list. */
  position: { min: 0, max: 999 },

  /** How many pairs a home page block shows. */
  itemLimit: { min: 0, max: 24 },
} as const;

/** "That is too long — 120 characters at most." */
export function tooLong(max: number): string {
  return `That is too long — ${max} characters at most.`;
}

/** Rupees with Indian digit grouping, for error messages. */
export function rupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
