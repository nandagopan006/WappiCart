import Image from "next/image";
import Link from "next/link";

import { ImageReveal } from "@/components/image-reveal";
import { Magnetic } from "@/components/magnetic";
import { ProximityText } from "@/components/proximity-text";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatPrice, type Product } from "@/lib/catalogue";

/**
 * The opening. One pair, full screen, then the line that explains it.
 *
 * ── The banner ───────────────────────────────────────────────────────────
 * The photograph breaks the page container and fills the viewport: full
 * bleed edge to edge, and tall enough that its bottom edge lands exactly at
 * the fold. The height subtracts the sticky header and the label bar above
 * it — `100svh` rather than `100vh`, because on a phone `vh` is measured
 * against the browser chrome's collapsed state and the image would be cut
 * off by the address bar on first paint.
 *
 * ── Everything else sits in the grid ─────────────────────────────────────
 * The label bar above and the headline block below both return to the page
 * container and the same left margin as every other section. Nothing is
 * positioned over the photograph — the banner is full screen because it is
 * the only thing on screen, not because type is layered onto it.
 */
/* Counts arrive as props rather than being read here: this component renders
   inside the home page, which has already loaded the catalogue, and a second
   read for two numbers would be a second query on every render. */
export function HomeHero({
  product,
  styleCount,
  pairCount,
}: {
  product: Product;
  styleCount: number;
  pairCount: number;
}) {
  const lead = product;

  return (
    <section className="border-line border-b">
      {/* The label line, pinned to both margins. */}
      <div className="max-w-page mx-auto px-4 md:px-8">
        <ScrollReveal
          as="div"
          className="text-caption text-grey border-line flex items-center justify-between gap-4 border-b py-4 uppercase"
        >
          {/* Both halves shed their tail on a narrow screen. At 360px the
              full strings very nearly touch in the middle, and two labels
              meeting is worse than two shorter ones. */}
          <span className="truncate">
            Autumn shelf<span className="hidden sm:inline"> — Kerala</span>
          </span>
          <span className="shrink-0 tabular-nums">
            {styleCount} styles
            <span className="hidden sm:inline"> / {pairCount} pairs</span>
          </span>
        </ScrollReveal>
      </div>

      {/* ── The banner ───────────────────────────────────────────────────
          Outside the container on purpose: this is the one element on the
          site that runs the full width of the window.

          ── Why the height is not full-screen on a phone ─────────────────
          A viewport-height box on a 360px screen is a tall portrait frame,
          and these photographs are landscape — `object-cover` then throws
          away most of the shoe to fill it. So the phone gets a 4:5 plate,
          which crops far less and still fills the screen it is on. It also
          leaves the top of the next section visible, which is the cheapest
          way to tell a shopper there is more below.

          From `md` the frame is landscape anyway, so it can take the full
          window: the sticky header (two rows, ~6rem) plus the label bar
          above (~3.5rem) come off the top. `min-h` keeps it sane on a short
          laptop window in landscape. */}
      <ImageReveal
        from="bottom"
        scale={1.06}
        className="bg-mist relative aspect-4/5 w-full sm:aspect-3/2 md:aspect-auto md:h-[calc(100svh-9.5rem)] md:min-h-[22rem]"
      >
        <Image
          src={lead.image}
          alt={lead.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </ImageReveal>

      {/* ── The headline, under the banner ───────────────────────────── */}
      <div className="max-w-page mx-auto px-4 md:px-8">
        <div className="grid gap-6 pt-12 pb-10 md:grid-cols-12 md:gap-8 md:pt-16 md:pb-12">
          <ScrollReveal className="md:col-span-7">
            {/* The letters rise toward the cursor. Desktop only — the
                component attaches nothing on a touch device. */}
            <ProximityText as="h1" className="text-display text-ink font-light uppercase">
              Every pair
            </ProximityText>
          </ScrollReveal>

          <ScrollReveal className="md:col-span-4 md:col-start-9 md:self-end" delay={0.12}>
            <p className="text-lead text-grey max-w-[34ch]">
              Twelve styles, chosen by two people, sold one message at a time.
            </p>
          </ScrollReveal>
        </div>

        {/* ── The facts, on one hairline ─────────────────────────────── */}
        <ScrollReveal
          as="div"
          className="border-line flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t py-6"
        >
          {/* Names the pair actually in the banner, so the opening image is
              also a product a shopper can reach. */}
          <Link
            href={`/p/${lead.slug}`}
            className="link-quiet text-caption text-grey hover:text-ink uppercase"
          >
            {lead.name} / {formatPrice(lead.price)} →
          </Link>

          <Magnetic strength={10}>
            <Link
              href="/shop"
              className="text-caption border-ink bg-ink text-paper hover:bg-paper hover:text-ink inline-flex h-13 items-center px-10 uppercase transition-colors"
            >
              Shop the shelf
            </Link>
          </Magnetic>
        </ScrollReveal>
      </div>
    </section>
  );
}
