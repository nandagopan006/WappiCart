import Image from "next/image";
import Link from "next/link";

import { ImageReveal } from "@/components/image-reveal";
import { ProximityText } from "@/components/proximity-text";
import { ScrollReveal } from "@/components/scroll-reveal";
import { cx } from "@/lib/cx";
import { formatPrice, type Category, type Product } from "@/lib/catalogue";

/**
 * A shelf introduced properly, rather than as a card with a label on it.
 *
 * ── The layout ───────────────────────────────────────────────────────────
 * Two columns of a twelve-column grid: the lead photograph in seven, the text
 * in four, with a whole column of gutter between them. Nothing overlaps and
 * nothing is pulled back over anything with a negative margin — the two
 * columns simply sit side by side and share a top edge.
 *
 * `side` swaps which column each one occupies. Two of these run on the home
 * page and they must not be the same shape twice; alternating is the cheapest
 * way to give a long page rhythm, and the most obvious thing to forget.
 *
 * The supporting pairs sit under the text column as a plain two-up, aligned to
 * the same edge as the paragraph above them.
 */
export function CategoryStory({
  category,
  label,
  lead,
  support,
  count,
  blurb,
  index,
  side = "left",
}: {
  /** The shelf's slug. Only ever used to build the link. */
  category: Category;
  /** The shelf's name, which is what a shopper reads. */
  label: string;
  /** Place in the home page's sequence. Rendered as 01, 02, … */
  index: number;
  /** The pair that carries the section. */
  lead: Product;
  /** Two more from the same shelf, shown small. */
  support: Product[];
  count: number;
  blurb: string;
  /** Which side the large photograph sits on. */
  side?: "left" | "right";
}) {
  const href = `/shop?c=${category}`;

  return (
    <section className="max-w-page mx-auto px-4 py-section md:px-8">
      <div className="grid gap-10 md:grid-cols-12 md:gap-8">
        {/* ── The lead photograph ──────────────────────────────────────── */}
        <div
          className={cx(
            "md:row-start-1",
            side === "left" ? "md:col-span-7 md:col-start-1" : "md:col-span-7 md:col-start-6",
          )}
        >
          <Link href={href} className="group block focus-visible:outline-offset-4">
            <ImageReveal
              from={side === "left" ? "left" : "right"}
              scale={1.08}
              className="bg-mist relative aspect-4/3"
            >
              <Image
                src={lead.image}
                alt={lead.alt}
                fill
                sizes="(min-width: 768px) 58vw, 100vw"
                className="plate-media object-cover"
              />
            </ImageReveal>
          </Link>
        </div>

        {/* ── The text column ──────────────────────────────────────────── */}
        <div
          className={cx(
            "md:row-start-1",
            side === "left" ? "md:col-span-4 md:col-start-9" : "md:col-span-4 md:col-start-1",
          )}
        >
          <p className="text-caption text-grey flex items-baseline gap-4 uppercase">
            <span aria-hidden="true" className="tabular-nums">
              {String(index).padStart(2, "0")}
            </span>
            <span>The shelf</span>
          </p>

          <ScrollReveal className="mt-5">
            <Link href={href} className="group block focus-visible:outline-offset-4">
              <ProximityText as="h2" className="text-display text-ink font-light uppercase">
                {label}
              </ProximityText>
            </Link>

            <p className="text-body text-grey mt-5 max-w-[34ch]">{blurb}</p>

            <Link href={href} className="link-quiet text-caption text-ink mt-5 inline-block uppercase">
              All {count} {count === 1 ? "style" : "styles"} →
            </Link>
          </ScrollReveal>

          {/* Two more from the shelf. The section proves the category has
              depth instead of claiming it. */}
          {support.length > 0 ? (
            <ScrollReveal stagger delay={0.15} className="mt-10 grid grid-cols-2 gap-4">
              {support.map((p) => (
                <Link key={p.slug} href={`/p/${p.slug}`} className="group block focus-visible:outline-offset-4">
                  <div className="bg-mist relative aspect-square overflow-hidden">
                    <Image
                      src={p.image}
                      alt={p.alt}
                      fill
                      sizes="(min-width: 768px) 16vw, 45vw"
                      className="tile-media object-cover"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <p className="text-caption text-ink truncate uppercase">{p.name}</p>
                    <p className="text-price text-ink shrink-0 tabular-nums">{formatPrice(p.price)}</p>
                  </div>
                </Link>
              ))}
            </ScrollReveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
