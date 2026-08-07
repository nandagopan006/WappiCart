import raw from "@/data/products.json";

export const CATEGORIES = ["sneakers", "formals", "loafers", "sandals"] as const;
export type Category = (typeof CATEGORIES)[number];

/** The full size run the shop carries. Sizes outside it cannot be stocked. */
export const SIZE_RUN = [6, 7, 8, 9, 10, 11] as const;

export type Product = {
  /** Becomes the URL: /p/<slug> */
  slug: string;
  name: string;
  category: Category;
  /** Rupees. No decimals, no currency symbol. */
  price: number;
  /** Optional strike-through price. */
  mrp?: number;
  /**
   * Two to four views of the same pair. images[0] is the strict side profile —
   * it is what the grid, the hero and the OG card all use, so it is the one
   * that has to rest on the wave.
   */
  images: string[];
  /**
   * Alias for images[0]. Derived in validate(), never written in the JSON, so
   * the two cannot drift apart.
   */
  image: string;
  /** Describes the shoe — colour, material, angle. Never "product image". */
  alt: string;
  /** Only the sizes actually in stock. */
  sizes: number[];
  /** One or two words, matching the photograph. "Off-white", "Oxblood". */
  colour: string;
  material: string;
  fitNote?: string;
  /**
   * Two or three short sentences: what it is made of, what it is for, and one
   * honest thing about wearing it. A shop that says what a shoe is bad at gets
   * believed about what it is good at.
   */
  description: string;
  /** One or two plain sentences. Practical only. */
  care: string;
  /** Shows on the homepage. Keep it to three, or the homepage becomes /shop. */
  featured?: boolean;
  /** Renders a small mono "new" label. Take it off once it is not. */
  isNew?: boolean;
  sku: string;
};

/** The JSON on disk carries `images`; `image` is derived, so it is absent. */
type ProductInput = Omit<Product, "image">;

/**
 * JSON imports widen `"sneakers"` to `string`, so TypeScript alone cannot catch
 * a mistyped category. This runs at module load — which happens during
 * `next build` while prerendering — so a bad product breaks the build rather
 * than shipping a broken page.
 */
function validate(entries: ProductInput[]): Product[] {
  const seenSlugs = new Set<string>();
  const seenSkus = new Set<string>();

  for (const p of entries) {
    const where = p.slug || p.name || "(unnamed product)";

    if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) {
      throw new Error(`products.json — "${where}": slug must be lowercase letters, numbers and dashes.`);
    }
    if (seenSlugs.has(p.slug)) {
      throw new Error(`products.json — duplicate slug "${p.slug}". Slugs are URLs, they must be unique.`);
    }
    seenSlugs.add(p.slug);

    if (seenSkus.has(p.sku)) {
      throw new Error(`products.json — duplicate SKU "${p.sku}". The SKU goes into the WhatsApp message.`);
    }
    seenSkus.add(p.sku);

    if (!CATEGORIES.includes(p.category)) {
      throw new Error(
        `products.json — "${where}": category "${p.category}" is not one of ${CATEGORIES.join(", ")}.`,
      );
    }
    if (!Number.isInteger(p.price) || p.price <= 0) {
      throw new Error(`products.json — "${where}": price must be a whole number of rupees.`);
    }
    if (p.mrp !== undefined && p.mrp <= p.price) {
      throw new Error(`products.json — "${where}": mrp must be higher than price, or left out.`);
    }
    if (!Array.isArray(p.images) || p.images.length < 2 || p.images.length > 4) {
      throw new Error(`products.json — "${where}": images needs 2 to 4 views. images[0] is the side profile.`);
    }
    /* Two forms are allowed, and nothing else. A bare filename or an
       unrecognised host would sail past next/image's remotePatterns and fail
       at render time on a page that had already been prerendered. */
    for (const src of p.images) {
      const local = src.startsWith("/");
      const unsplash = src.startsWith("https://images.unsplash.com/photo-");

      if (!local && !unsplash) {
        throw new Error(
          `products.json — "${where}": image "${src}" must be a path inside /public (e.g. "/shoes/name.webp") ` +
            `or an images.unsplash.com photo URL. Any other host is blocked by next.config.ts.`,
        );
      }
    }
    if (!p.alt || p.alt.length < 20) {
      throw new Error(
        `products.json — "${where}": alt must describe the shoe. A screen reader user is shopping too.`,
      );
    }
    if (p.sizes.length === 0) {
      throw new Error(`products.json — "${where}": no sizes left. Remove the product rather than listing it empty.`);
    }
    for (const size of p.sizes) {
      if (!(SIZE_RUN as readonly number[]).includes(size)) {
        throw new Error(
          `products.json — "${where}": size ${size} is outside the shop's run (${SIZE_RUN.join(", ")}).`,
        );
      }
    }
    if (!p.colour) {
      throw new Error(`products.json — "${where}": colour is missing. One or two words, matching the photograph.`);
    }
    if (!p.description) {
      throw new Error(`products.json — "${where}": description is missing. Two or three short sentences.`);
    }
    if (!p.care) {
      throw new Error(`products.json — "${where}": care is missing. One or two plain sentences.`);
    }
    if (!p.material) {
      throw new Error(`products.json — "${where}": material is what the shopper asks about first.`);
    }
  }

  /* `image` is derived here rather than stored, so images[0] and image can
     never disagree about which photograph is the side profile. */
  return entries.map((p) => ({ ...p, image: p.images[0] }));
}

export const products: Product[] = validate(raw as ProductInput[]);

/** The homepage's three. It is a shopfront window, not the catalogue. */
export function featuredProducts(): Product[] {
  return products.filter((p) => p.featured);
}

/** How many pairs sit in each category, for the homepage's category list. */
export function countByCategory(): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const p of products) counts[p.category] += 1;
  return counts;
}

/**
 * A few pairs from each category, for the thumbnails on the homepage's
 * category rows. A category named on its own is a table of contents; a
 * category with three shoes beside it is a shop.
 */
export function previewByCategory(limit = 3): Record<Category, Product[]> {
  return Object.fromEntries(
    CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).slice(0, limit)]),
  ) as Record<Category, Product[]>;
}

/** Other pairs from the same shelf, for "More in {category}". */
export function relatedProducts(product: Product, limit = 3): Product[] {
  return products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, limit);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** Live count for the hero. Real numbers build trust. */
export function pairsInStock(): number {
  return products.reduce((total, p) => total + p.sizes.length, 0);
}

/** Sizes that at least one product still has, used to dim the filter run. */
export function sizesInStock(): number[] {
  const stocked = new Set(products.flatMap((p) => p.sizes));
  return SIZE_RUN.filter((size) => stocked.has(size));
}

/** Categories that currently have at least one pair. */
export function categoriesInStock(): Category[] {
  const stocked = new Set(products.map((p) => p.category));
  return CATEGORIES.filter((c) => stocked.has(c));
}

export function formatPrice(rupees: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(rupees)}`;
}

/**
 * The same price for an OG card.
 *
 * OG images are rasterised outside the browser, and the renderer has no font
 * covering ₹ (U+20B9) — the glyph comes out as an empty box in the one place a
 * shopper cannot zoom in to check. Spelling the currency is the honest fallback.
 */
export function formatPriceForImage(rupees: number): string {
  return `Rs ${new Intl.NumberFormat("en-IN").format(rupees)}`;
}
