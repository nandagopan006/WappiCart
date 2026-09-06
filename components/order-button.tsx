"use client";

import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import type { Product } from "@/lib/catalogue";
import { buildOrderLink, type ShopContact } from "@/lib/whatsapp";
import { cx } from "@/lib/cx";

/**
 * The only conversion path on the site.
 *
 * Disabled until a size is picked — a message without a size starts a
 * back-and-forth, and back-and-forth loses the sale. An anchor cannot be
 * disabled, so the inert state is a real disabled button.
 */
export function OrderButton({
  product,
  size,
  shop,
  className,
}: {
  product: Product;
  size: number | null;
  /* Passed down rather than imported: this is a Client Component and the
     shop's phone number now lives in the database. `buildOrderLink` has no
     fallback on purpose — a placeholder number that silently swallows orders
     is worse than a type error. */
  shop: ShopContact;
  className?: string;
}) {
  /* A square-cornered block, ink on paper. The border is always present so the
     hover inversion swaps two fills without shifting anything a pixel. */
  const base =
    "text-caption flex h-13 w-full items-center justify-center gap-2 border uppercase transition-colors focus-visible:outline-offset-4";

  if (size === null) {
    return (
      <button
        type="button"
        disabled
        className={cx(base, "border-line text-grey cursor-not-allowed", className)}
      >
        Pick a size to order
      </button>
    );
  }

  return (
    <a
      href={buildOrderLink({ product, size, shop })}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(base, "border-ink bg-ink text-paper hover:bg-paper hover:text-ink", className)}
    >
      <WhatsappGlyph className="text-whatsapp" />
      Order on WhatsApp
    </a>
  );
}
