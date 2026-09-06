import type { Metadata } from "next";

import { WishlistGrid } from "@/components/wishlist-grid";
import { publishedProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Saved",
  description: "The pairs you have saved. Pick a size and order the one you want on WhatsApp.",
  alternates: { canonical: "/wishlist" },
  /* The list lives in one browser's storage, so there is nothing here for a
     crawler to index and no two visitors would see the same page. */
  robots: { index: false, follow: true },
};

/**
 * The saved pairs.
 *
 * A Server Component that hands the validated catalogue down to the one
 * client component that needs it — the page itself stays static and the only
 * JavaScript is the grid that reads the saved slugs.
 *
 * Same grid and same tiles as every other page. A wishlist that invents its
 * own product card is a second design system.
 *
 * The heading lives inside `WishlistGrid` rather than here, because it carries
 * the live count and the clear-all control — both of which need the browser.
 * Lifting it out would mean either two sources of truth for the count or
 * making this whole route a Client Component for one number.
 */
export default async function WishlistPage() {
  const products = await publishedProducts();

  return (
    <div className="max-w-page mx-auto px-4 pt-10 pb-section md:px-8 md:pt-14">
      <WishlistGrid products={products} />
    </div>
  );
}
