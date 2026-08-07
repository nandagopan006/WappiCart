import Image from "next/image";
import Link from "next/link";

import { Parallax } from "@/components/parallax";
import { Price } from "@/components/price";
import { ShowroomReveal } from "@/components/showroom-reveal";
import { SplitText } from "@/components/split-text";
import { Wave } from "@/components/wave";
import { featuredProducts, products } from "@/lib/products";

/**
 * Three pairs, presented as plates in a catalogue rather than cards in a grid.
 *
 * ── Why this is not a row of cards ───────────────────────────────────────
 * It was three identical tiles, evenly spaced, all the same size. That is the
 * arrangement every shop template arrives at, and it gives the eye nothing to
 * do: three equal things read as inventory, not as a selection somebody made.
 *
 * A plate is the opposite. Each pair takes a full band of the page, the
 * photograph and the type swap sides down the sequence, and the image ratio
 * changes plate to plate — tall, then wide, then square. Nothing lines up with
 * the plate above it, which is what stops the section scanning as a grid.
 *
 * The numeral is the device that holds it together: set enormous in Fraunces
 * at 6% opacity, bleeding off the edge behind the photograph. It is a
 * watermark, not a label — you read it as texture first and as an index
 * second. Numbering is only honest when the content really is a sequence, and
 * three plates in a shop window are exactly that.
 *
 * Every existing part is reused rather than reinvented: ShowroomReveal brings
 * each plate in, Parallax drifts the photograph inside its frame, Price
 * formats the rupees, Wave closes the band. This stays a Server Component —
 * the only client code involved is the two wrappers that were already client.
 */

/** Tall, wide, square. The ratio changing per plate is doing as much work as
    the alternating sides — a column of identical crops is still a grid. */
const PLATE_RATIO = ["aspect-4/5", "aspect-5/4", "aspect-square"];

export function FeaturedPairs() {
  /* The hero already shows featured[0]. Starting at 1 keeps the same
     photograph from appearing twice on one screen — and stops Next flagging
     the second, unprioritised copy of it as the LCP image. */
  const featured = featuredProducts().slice(1, 4);

  return (
    /* overflow-x-clip, not overflow-hidden: the numerals deliberately hang 3%
       outside the container, and at a viewport exactly as wide as max-w-page
       that would push horizontal scroll. `clip` contains them without creating
       a scroll container — which `hidden` would, breaking the sticky header
       above. The plate shadows are vertical, so nothing visible is lost. */
    <section className="max-w-page mt-section mx-auto overflow-x-clip px-5 md:px-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-utility text-muted uppercase">
            Selected · {String(featured.length).padStart(2, "0")} pairs
          </p>
          <SplitText
            as="h2"
            onScroll
            stagger={0.024}
            className="type-heading text-h2 mt-3 block"
          >
            In the window
          </SplitText>
        </div>

        <Link
          href="/shop"
          className="link-underline font-mono text-utility text-muted hover:text-espresso group shrink-0 pb-2 uppercase"
        >
          All {products.length} styles{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>

      <Wave className="mt-6" />

      <div className="mt-14 md:mt-20">
        {featured.map((product, i) => {
          const flipped = i % 2 === 1;

          return (
            <ShowroomReveal key={product.slug} className="mb-20 last:mb-0 md:mb-32">
              <article className="relative">
                {/* The watermark. aria-hidden because "02" read aloud between a
                    shoe's name and its price is noise, not information. */}
                <span
                  aria-hidden="true"
                  className={`type-display text-espresso/[0.06] pointer-events-none absolute -top-[6%] z-0 hidden leading-none text-[clamp(7rem,17vw,15rem)] select-none md:block ${
                    flipped ? "-right-[3%]" : "-left-[3%]"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="relative z-10 grid items-center gap-8 md:grid-cols-12 md:gap-12">
                  <Link
                    href={`/p/${product.slug}`}
                    aria-label={product.name}
                    tabIndex={-1}
                    className={`group block md:col-span-7 ${
                      flipped ? "md:order-2 md:col-start-6" : "md:order-1"
                    }`}
                  >
                    <Parallax
                      distance={18}
                      className={`plate-media relative overflow-hidden ${PLATE_RATIO[i % PLATE_RATIO.length]}`}
                    >
                      <div className="card-media absolute inset-0">
                        <Image
                          src={product.image}
                          alt={product.alt}
                          fill
                          sizes="(min-width: 768px) 58vw, 92vw"
                          className="object-cover"
                        />
                      </div>
                    </Parallax>
                  </Link>

                  <div
                    className={`md:col-span-5 ${
                      flipped ? "md:order-1 md:col-start-1 md:row-start-1" : "md:order-2"
                    }`}
                  >
                    <p className="font-mono text-utility text-muted uppercase">
                      {product.category}
                      {product.isNew ? " · New" : null}
                    </p>

                    <h3 className="type-heading mt-3 text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.05]">
                      <Link href={`/p/${product.slug}`} className="link-underline">
                        {product.name}
                      </Link>
                    </h3>

                    <Price price={product.price} mrp={product.mrp} className="mt-4 block" />

                    {/* One honest line. The fit note if there is one, because
                        that is the thing a shopper actually wants to know
                        before they tap through. */}
                    <p className="text-body text-muted mt-5 max-w-[38ch]">
                      {product.fitNote ?? product.material}
                    </p>

                    <Link
                      href={`/p/${product.slug}`}
                      className="link-underline font-mono text-utility group mt-7 inline-flex items-center gap-2 uppercase"
                    >
                      View the pair
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </Link>
                  </div>
                </div>

                <Wave className="mt-12 h-4 md:mt-16" />
              </article>
            </ShowroomReveal>
          );
        })}
      </div>
    </section>
  );
}
