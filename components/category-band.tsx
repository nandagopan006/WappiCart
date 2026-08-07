import Image from "next/image";
import Link from "next/link";

import { Parallax } from "@/components/parallax";
import { ShowroomReveal } from "@/components/showroom-reveal";
import { SplitText } from "@/components/split-text";
import { CATEGORIES, countByCategory, previewByCategory, type Category } from "@/lib/products";

/**
 * A dark band across the page: four shelves, standing at four different
 * heights.
 *
 * ── Why this is not four equal cards ─────────────────────────────────────
 * It was — image, name, count, blurb, repeated four times on a strict grid.
 * That is the same failure the product section had: four identical things read
 * as a menu, and a menu is something you scan past rather than look at.
 *
 * Two changes fix it without adding a single element. The name is set large
 * and moved *above* its photograph, so the eye travels type → image rather
 * than image → caption — and a row of lowercase Fraunces across a dark band is
 * a far better thing to meet than a row of thumbnails. And the columns sit at
 * alternating heights with alternating ratios, so no two start or finish on
 * the same line and the row reads as objects placed on a shelf rather than
 * cells in a table.
 *
 * The band stays espresso because it cuts the blush gradient in half and gives
 * the page a spine — the one dark passage between the hero and the footer.
 */

/** One honest line each. What the shelf is for, not what it is called. */
const BLURB: Record<Category, string> = {
  sneakers: "Canvas and leather, for the days you are on your feet.",
  formals: "Welted, resoleable, made to outlast the occasion.",
  loafers: "On and off without hands. Suede, calf and pebbled rubber.",
  sandals: "Hand-stitched hide and moulded footbeds for the heat.",
};

/* Tall, square, tall, square — with four different drops. Together these are
   what stop the row scanning as a grid. */
const SHELF_RATIO = ["aspect-3/4", "aspect-square", "aspect-3/4", "aspect-square"];
const SHELF_DROP = ["md:mt-0", "md:mt-16", "md:mt-6", "md:mt-24"];

export function CategoryBand() {
  const counts = countByCategory();
  const previews = previewByCategory(1);
  const total = CATEGORIES.reduce((sum, c) => sum + counts[c], 0);

  return (
    <section className="bg-espresso text-blush mt-section relative overflow-hidden">
      {/* Light, not paint. The one place ember appears outside the filter. */}
      <div className="ember-glow -top-[45%] -right-[10%]" aria-hidden="true" />

      <div className="max-w-page relative mx-auto px-5 py-16 md:px-8 md:py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-utility text-blush/50 uppercase">
              Four shelves · {total} styles
            </p>
            <SplitText as="h2" onScroll stagger={0.024} className="type-heading text-h2 mt-3 block">
              Browse the shelves
            </SplitText>
          </div>

          <Link
            href="/shop"
            className="link-underline font-mono text-utility text-blush/60 hover:text-blush group shrink-0 pb-2 uppercase"
          >
            All shoes{" "}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-20 md:grid-cols-4 md:gap-x-8">
          {CATEGORIES.map((category, i) => (
            <ShowroomReveal key={category} index={i} className={SHELF_DROP[i]}>
              <Link href={`/shop?c=${category}`} className="group block focus-visible:outline-offset-8">
                {/* Type first. The name is the thing being chosen between; the
                    photograph is the evidence for it. */}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="type-heading text-[clamp(1.375rem,2.4vw,2rem)] leading-none lowercase">
                    {category}
                  </h3>
                  <span className="font-mono text-utility text-blush/40 shrink-0 tabular-nums">
                    {String(counts[category]).padStart(2, "0")}
                  </span>
                </div>

                <Parallax
                  distance={16}
                  className={`shelf-media relative mt-5 overflow-hidden ${SHELF_RATIO[i]}`}
                >
                  <div className="card-media absolute inset-0">
                    <Image
                      src={previews[category][0].image}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 22vw, 45vw"
                      className="object-cover"
                    />
                  </div>
                </Parallax>

                <p className="text-body text-blush/65 mt-5">{BLURB[category]}</p>

                <span className="font-mono text-utility mt-4 inline-flex items-center gap-2 uppercase">
                  Shop
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </Link>
            </ShowroomReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
