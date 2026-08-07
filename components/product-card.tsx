import Image from "next/image";
import Link from "next/link";

import { Parallax } from "@/components/parallax";
import { Price } from "@/components/price";
import { Wave } from "@/components/wave";
import type { Product } from "@/lib/products";

/**
 * Image, name, price. Nothing else — no badges, no sale flags, no star ratings
 * we do not have data for.
 *
 * The photograph sits flush on the line. No card background, no border box, no
 * drop shadow — the line is the only structure.
 *
 * Every photograph is cropped to 4:3 rather than shown at its own ratio. A grid
 * of shoes photographed by different people is a grid of different shapes, and
 * the eye reads that as clutter before it reads any of the shoes.
 *
 * ── Motion ───────────────────────────────────────────────────────────────
 * The image drifts inside its frame as the page scrolls, so a grid of cards
 * has depth rather than being one flat sheet moving past. On hover it eases up
 * to fill more of the frame while the whole card lifts — the shoe comes toward
 * you and the card comes off the shelf, which is one gesture read two ways.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <Link href={`/p/${product.slug}`} className="group block focus-visible:outline-offset-8">
      <Parallax distance={14} className="relative aspect-4/3 overflow-hidden">
        <div className="card-media absolute inset-0">
          <Image
            src={product.image}
            alt={product.alt}
            fill
            priority={priority}
            sizes="(min-width: 768px) 33vw, 50vw"
            className="pair object-cover"
          />
        </div>
      </Parallax>

      <Wave className="-mx-3 h-2 md:-mx-5" />

      <div className="pt-3 md:pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body font-medium">{product.name}</h3>
          {product.isNew ? (
            <span className="font-mono text-utility text-muted shrink-0 uppercase">New</span>
          ) : null}
        </div>
        <Price price={product.price} mrp={product.mrp} className="mt-1 block" />
      </div>
    </Link>
  );
}
