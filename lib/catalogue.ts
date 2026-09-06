/**
 * The basic facts about the shop: what a product looks like, which categories
 * exist, which sizes are sold, and how to format a price.
 *
 * IMPORTANT: this file must never import the database. Components that run in
 * the browser import from here, and anything this file touches gets bundled
 * into the browser too. Database code lives in lib/products.ts instead.
 */

/* ── Categories ─────────────────────────────────────────────────────────── */

/**
 * A shelf is a row in the `categories` table, not a name in this file.
 *
 * It used to be a fixed union of four slugs, which made `Category` a
 * compile-time type and every shelf list a `.map` over a constant. That is why
 * adding a fifth shelf needed a code change. The admin can now create, rename
 * and delete shelves, so the set is only knowable at runtime and `Category` is
 * just the slug string.
 *
 * What that costs: nothing can be `Record<Category, X>` any more, and a slug
 * cannot be validated by `z.enum`. Existence is enforced where it actually
 * matters — the `category_slug` foreign key on `products`, which is also what
 * stops a shelf being deleted out from under a pair.
 */
export type Category = string;

/** A shelf, as everything that renders one sees it. */
export type Shelf = {
  slug: Category;
  name: string;
  description: string;
  imageUrl: string | null;
  position: number;
  enabled: boolean;
};

/**
 * What a slug is allowed to look like.
 *
 * Matches the `categories_slug_shape` check in the database. A slug is a URL
 * segment (`/shop?c=<slug>`) and a filter value, so it is lowercase, digits
 * and hyphens — nothing that needs escaping.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Whether a slug names one of these shelves.
 *
 * Takes the shelves rather than reading them, so browser components can call
 * it with the list the server already sent.
 */
export function isCategoryIn(value: unknown, shelves: readonly { slug: string }[]): value is Category {
  return typeof value === "string" && shelves.some((s) => s.slug === value);
}

/* ── Sizes ──────────────────────────────────────────────────────────────── */

/** The full size run the shop carries. Sizes outside it cannot be stocked. */
export const SIZE_RUN = [6, 7, 8, 9, 10, 11] as const;
export type Size = (typeof SIZE_RUN)[number];

export function isSize(value: unknown): value is Size {
  return typeof value === "number" && (SIZE_RUN as readonly number[]).includes(value);
}

/* ── The product ────────────────────────────────────────────────────────── */

/**
 * One pair of shoes, as every part of the shop sees it.
 *
 * `image` is always just `images[0]`. It is worked out when the product is
 * loaded and never stored, so the two can never disagree.
 */
export type Product = {
  /** Becomes the URL: /p/<slug> */
  slug: string;
  name: string;
  category: Category;
  /** Rupees. No decimals, no currency symbol. */
  price: number;
  /** Optional strike-through price. Always higher than `price`. */
  mrp?: number;
  /** Two to four views. images[0] is the strict side profile. */
  images: string[];
  /** Alias for images[0]. Derived, never stored. */
  image: string;
  /** Describes the shoe — colour, material, angle. Never "product image". */
  alt: string;
  /** Only the sizes actually in stock. */
  sizes: number[];
  colour: string;
  material: string;
  fitNote?: string;
  description: string;
  care: string;
  featured?: boolean;
  isNew?: boolean;
  sku: string;
};

/* ── Price bands ────────────────────────────────────────────────────────── */

/**
 * The three price ranges the /shop filter offers. The boundaries sit in the
 * gaps between real prices, so no band ends up nearly empty.
 */
export const PRICE_BANDS = [
  { id: "under-2000", label: "Under ₹2,000", min: 0, max: 1999 },
  { id: "2000-3500", label: "₹2,000 – ₹3,500", min: 2000, max: 3500 },
  { id: "over-3500", label: "Over ₹3,500", min: 3501, max: Number.POSITIVE_INFINITY },
] as const;

export type PriceBandId = (typeof PRICE_BANDS)[number]["id"];

export function inPriceBand(product: Product, id: PriceBandId): boolean {
  const band = PRICE_BANDS.find((b) => b.id === id);
  /* Unknown band shows everything, rather than an empty shelf. */
  if (!band) return true;
  return product.price >= band.min && product.price <= band.max;
}

/* ── Pure list helpers ──────────────────────────────────────────────────── */

/**
 * Other pairs from the same category.
 *
 * The product list is passed in rather than read from the database here, so
 * browser components can use this function too.
 */
export function relatedFrom(catalogue: Product[], product: Product, limit = 3): Product[] {
  return catalogue
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, limit);
}

/** How many pairs sit in each category. */
export function countByCategoryFrom(
  catalogue: Product[],
  /* The shelves, so one holding nothing still reports 0 rather than being
     absent from the map. A caller with no list gets only the shelves that
     actually have stock, which is what the dashboard wants. */
  shelves: readonly { slug: string }[] = [],
): Record<Category, number> {
  const counts: Record<Category, number> = Object.fromEntries(shelves.map((s) => [s.slug, 0]));
  for (const p of catalogue) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
}

/** Live count for the hero. Real numbers build trust. */
export function pairsInStockFrom(catalogue: Product[]): number {
  return catalogue.reduce((total, p) => total + p.sizes.length, 0);
}

/** Sizes that at least one product still has, used to dim the filter run. */
export function sizesInStockFrom(catalogue: Product[]): number[] {
  const stocked = new Set(catalogue.flatMap((p) => p.sizes));
  return SIZE_RUN.filter((size) => stocked.has(size));
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

export function formatPrice(rupees: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(rupees)}`;
}

/**
 * The price for share images. Writes "Rs" instead of the rupee sign, because
 * the image renderer has no font for it and would draw an empty box.
 */
export function formatPriceForImage(rupees: number): string {
  return `Rs ${new Intl.NumberFormat("en-IN").format(rupees)}`;
}
