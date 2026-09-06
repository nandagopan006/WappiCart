import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/price";
import { WishlistButton } from "@/components/wishlist-button";
import type { Product } from "@/lib/catalogue";

/**
 * One pair in the grid. Photograph, name, price. Nothing else.
 *
 * No card, no border, no shadow, no badges, no star ratings we have no data
 * for. The photograph sits on a pale square plate and the caption sits under
 * it — the layout a shoe shop's own catalogue uses, because a dense grid is
 * read by scanning photographs, not by reading labels.
 *
 * ── One ratio, everywhere ────────────────────────────────────────────────
 * Every photograph is cropped square. A grid of shoes photographed by
 * different people is a grid of different shapes, and the eye reads that as
 * clutter before it reads any of the shoes.
 *
 * ── The caption ──────────────────────────────────────────────────────────
 * Name left, price right, both on one baseline and both ink — so the row has
 * two anchors at the photograph's own edges rather than a centred stack
 * floating under it. The colour sits below in grey, which is what tells two
 * loafers apart at this size.
 *
 * ── Why this is a div and not a Link ─────────────────────────────────────
 * The whole tile used to be one anchor. The heart is a `<button>`, and
 * interactive content inside an `<a>` is invalid HTML and behaves
 * inconsistently under a keyboard. So the link and the button are now
 * siblings inside a positioned wrapper: the link still covers the
 * photograph and the caption, and the button sits above it. Nothing about
 * the tile's behaviour changes — the whole card is still one tap to the
 * product page.
 *
 * ── The second view ──────────────────────────────────────────────────────
 * `images[1]` is stacked over `images[0]` and dissolves in on hover. Both
 * occupy the same square plate, so there is no reflow and no ratio change to
 * flicker through. The swap is pure CSS — this stays a Server Component and
 * ships no JavaScript for the effect.
 *
 * **Only the top layer animates.** Fading the primary out while fading the
 * secondary in is the obvious way to write this and it is why the swap used
 * to flash: halfway through, both images sit at 50% over a pale plate and the
 * composite goes washed-out. Holding the primary fully opaque underneath
 * means the stack is never less than opaque, so there is nothing to dip.
 *
 * `--ease-fade`, not `--ease-settle`: the settle curve reaches ~70% in the
 * first fifth of its duration, which on opacity reads as a pop rather than a
 * dissolve. 700ms, symmetric, so leaving takes as long as arriving.
 *
 * Rendering the second image is also how it is preloaded: next/image loads it
 * when the tile scrolls into view, so the first hover is never the moment it
 * starts fetching. It is deliberately not `priority` — the first row's
 * *primary* images are what should win the network.
 *
 * A pair whose second entry is missing, or identical to the first, simply
 * does not get the effect rather than cross-fading to itself.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1400px) 450px, (min-width: 640px) 33vw, 50vw",
}: {
  product: Product;
  priority?: boolean;
  /**
   * The grid's own `sizes`, which is the default. The recommendation rail
   * overrides it: its slots are ~230px wide, and the grid value would have
   * next/image fetch a 466px source for each of eight tiles.
   */
  sizes?: string;
}) {
  const second = product.images[1];
  const swap = second && second !== product.image ? second : null;

  return (
    <div className="group relative">
      <Link href={`/p/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="bg-mist relative aspect-square overflow-hidden">
          {/* The scaling layer. Both views sit inside it, so the pair grows
              as one rather than the two crossfading at different sizes. */}
          <div className="tile-media absolute inset-0">
            {/* Never fades. See the note above — it is the opaque ground the
                second view dissolves onto. */}
            <Image
              src={product.image}
              alt={product.alt}
              fill
              priority={priority}
              sizes={sizes}
              className="object-cover"
            />

            {swap ? (
              /* Decorative: the primary image already carries the description,
                 and a screen reader does not need the same pair described
                 twice. */
              <Image
                src={swap}
                alt=""
                fill
                sizes={sizes}
                className="object-cover opacity-0 transition-opacity duration-700 ease-(--ease-fade) group-hover:opacity-100"
              />
            ) : null}
          </div>
        </div>

        {/* ── Why this wraps rather than truncates ──────────────────────
            This row used to be `truncate` + `shrink-0`, and it was the source
            of the page's horizontal overflow on phones. `truncate` sets
            `white-space: nowrap`, and a flex child's default `min-width: auto`
            resolves to its min-content size — with nowrap, that is the whole
            string on one line. The name therefore could not shrink, pushed the
            price outward, and made the row wider than the card it sits in. A
            2-up grid card is 136–183px on a phone; this caption needs ~212px
            with a struck-through MRP.

            `min-w-0` lets the name shrink, and `flex-wrap` lets the price drop
            to its own line rather than the name ellipsing away. On a desktop
            card both still sit on one baseline exactly as before — the wrap
            only engages where there is genuinely no room. */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h3 className="text-caption text-ink min-w-0 uppercase">{product.name}</h3>
          <Price price={product.price} mrp={product.mrp} className="shrink-0 tabular-nums" />
        </div>
        <p className="text-caption text-grey mt-1 uppercase">{product.colour}</p>
      </Link>

      {/* Top-right of the photograph, inset far enough to read as placed on
          the image rather than pinned to its corner. Identical on every tile,
          so the hearts line up across a row. */}
      <WishlistButton
        slug={product.slug}
        name={product.name}
        className="absolute top-1.5 right-1.5 z-10"
      />
    </div>
  );
}
