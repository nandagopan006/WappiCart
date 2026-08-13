import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/price";
import type { Product } from "@/lib/products";

/**
 * One pair in the grid. Photograph, name, price. Nothing else.
 *
 * No card, no border, no shadow, no badges, no star ratings we have no data
 * for. The photograph sits on a pale square plate and the caption sits under
 * it, centred — the layout a shoe shop's own catalogue uses, because a dense
 * grid is read by scanning photographs, not by reading labels.
 *
 * ── One ratio, everywhere ────────────────────────────────────────────────
 * Every photograph is cropped square. A grid of shoes photographed by
 * different people is a grid of different shapes, and the eye reads that as
 * clutter before it reads any of the shoes.
 *
 * ── The caption ──────────────────────────────────────────────────────────
 * Name in tracked uppercase at 11px, price under it at 12px. The name is
 * grey and the price is ink, so a shopper scanning for a number finds it
 * without reading a single word.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <Link href={`/p/${product.slug}`} className="group block focus-visible:outline-offset-4">
      <div className="bg-mist relative aspect-square overflow-hidden">
        <Image
          src={product.image}
          alt={product.alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="tile-media object-cover"
        />
      </div>

      <div className="px-2 pt-4 pb-2 text-center">
        <h3 className="text-caption text-grey uppercase">{product.name}</h3>
        <Price price={product.price} mrp={product.mrp} className="mt-1.5 block" />
      </div>
    </Link>
  );
}
