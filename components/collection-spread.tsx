import Image from "next/image";
import Link from "next/link";

import { ImageReveal } from "@/components/image-reveal";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatPrice, type Product } from "@/lib/products";

/**
 * Three pairs under one line of type.
 *
 * ── Why they are the same size ───────────────────────────────────────────
 * An earlier version hung them at three different ratios and three different
 * heights. On a mockup that reads as an editorial spread; on a real page it
 * reads as three photographs that failed to line up, and the captions
 * underneath never share a baseline. Equal plates on one row is the version
 * that actually looks composed.
 *
 * The rhythm comes from the section around it — a full-bleed band before, a
 * dark passage after — rather than from knocking these three out of line.
 */
export function CollectionSpread({
  products: items,
  eyebrow,
  headline,
  index,
}: {
  /** Three pairs. Extras are ignored; fewer degrades gracefully. */
  products: Product[];
  eyebrow: string;
  headline: string;
  /** Place in the home page's sequence. Rendered as 01, 02, … */
  index: number;
}) {
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section className="max-w-page mx-auto px-4 py-section md:px-8">
      <div className="section-index">
        <span aria-hidden="true" className="text-caption text-grey tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className="text-caption text-ink uppercase">{eyebrow}</h2>
      </div>

      <ScrollReveal className="mt-8">
        <p className="text-lead text-ink max-w-[46ch]">{headline}</p>
      </ScrollReveal>

      <ScrollReveal stagger delay={0.1} className="mt-10 grid gap-4 sm:grid-cols-3 md:gap-6">
        {shown.map((product) => (
          <Link
            key={product.slug}
            href={`/p/${product.slug}`}
            className="group block focus-visible:outline-offset-4"
          >
            <ImageReveal from="bottom" scale={1.08} className="bg-mist relative aspect-4/5">
              <Image
                src={product.image}
                alt={product.alt}
                fill
                sizes="(min-width: 640px) 32vw, 100vw"
                className="plate-media object-cover"
              />
            </ImageReveal>

            <div className="mt-3 flex items-baseline justify-between gap-3">
              <p className="text-caption text-ink truncate uppercase">{product.name}</p>
              <p className="text-price text-ink shrink-0 tabular-nums">{formatPrice(product.price)}</p>
            </div>
            <p className="text-caption text-grey mt-1 uppercase">{product.colour}</p>
          </Link>
        ))}
      </ScrollReveal>
    </section>
  );
}
