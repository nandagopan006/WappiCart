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
 * Name left, price right, both on one baseline and both ink — so the row
 * has two anchors at the photograph's own edges rather than a centred stack
 * floating under it. The colour sits below in grey, which is what tells two
 * loafers apart at this size.
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
          sizes="(min-width: 1400px) 450px, (min-width: 640px) 33vw, 50vw"
          className="tile-media object-cover"
        />
      </div>

      {/* Name and price on one baseline, pinned to opposite edges. Centring
          them was what made a grid of twelve read as a template — a caption
          aligned to the photograph's own edge reads as a catalogue entry. */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-caption text-ink truncate uppercase">{product.name}</h3>
        <Price price={product.price} mrp={product.mrp} className="shrink-0 tabular-nums" />
      </div>
      <p className="text-caption text-grey mt-1 uppercase">{product.colour}</p>
    </Link>
  );
}
