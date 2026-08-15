import Image from "next/image";
import Link from "next/link";

import { ImageReveal } from "@/components/image-reveal";
import { Magnetic } from "@/components/magnetic";
import { ProximityText } from "@/components/proximity-text";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatPrice, type Product } from "@/lib/products";

/**
 * The dark passage. One pair, on near-black.
 *
 * ── Why this section is inverted ─────────────────────────────────────────
 * Everything else on the site is a photograph on white. A page of nothing but
 * that is legible and completely flat — the eye gets no landmark, so a long
 * scroll reads as one undifferentiated sheet however the grids are arranged.
 * One band of ink halfway down splits the page into a before and an after,
 * and it costs no new colour and no decoration.
 *
 * It is the only inverted section on the site. A second one would make it a
 * stripe pattern rather than a landmark.
 *
 * ── The layout ───────────────────────────────────────────────────────────
 * Text column left, photograph right, both in the same twelve-column grid the
 * light sections use. No background image behind the text, no name laid over
 * the picture — the section is different in colour and identical in structure,
 * which is what stops it reading as a different website.
 */
export function ProductStory({ product, index }: { product: Product; index: number }) {
  return (
    <section className="bg-ink text-paper">
      <div className="max-w-page mx-auto px-4 py-section md:px-8">
        <div className="border-paper/15 text-caption text-paper/50 flex items-baseline gap-4 border-b pb-4 uppercase">
          <span aria-hidden="true" className="tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <span>The one we keep reordering</span>
        </div>

        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-12 md:gap-8">
          {/* ── The facts ───────────────────────────────────────────────── */}
          <ScrollReveal className="md:col-span-4 md:row-start-1 md:self-center">
            <ProximityText as="h2" className="text-display text-paper font-light uppercase">
              {product.name}
            </ProximityText>

            <p className="text-body text-paper/60 mt-5 max-w-[34ch]">{product.description}</p>

            <dl className="mt-8 space-y-3">
              <Spec label="Colour" value={product.colour} />
              <Spec label="Material" value={product.material} />
              <Spec label="Price" value={formatPrice(product.price)} />
            </dl>

            <div className="mt-8">
              <Magnetic strength={8}>
                <Link
                  href={`/p/${product.slug}`}
                  className="text-caption border-paper bg-paper text-ink hover:bg-ink hover:text-paper inline-flex h-13 items-center border px-10 uppercase transition-colors"
                >
                  Discover
                </Link>
              </Magnetic>
            </div>
          </ScrollReveal>

          {/* ── The photograph ──────────────────────────────────────────── */}
          <div className="md:col-span-7 md:col-start-6 md:row-start-1">
            <Link href={`/p/${product.slug}`} className="group block focus-visible:outline-offset-4">
              <ImageReveal from="bottom" scale={1.08} className="relative aspect-4/3 bg-white/5">
                <Image
                  src={product.image}
                  alt={product.alt}
                  fill
                  sizes="(min-width: 768px) 58vw, 100vw"
                  className="plate-media object-cover"
                />
              </ImageReveal>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One fact per row, label left, value right, on the section's own hairline. */
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-paper/15 flex items-baseline justify-between gap-4 border-b pb-3">
      <dt className="text-caption text-paper/50 uppercase">{label}</dt>
      <dd className="text-caption text-paper uppercase">{value}</dd>
    </div>
  );
}
