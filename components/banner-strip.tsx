import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/lib/products";

/**
 * A pale full-width band with a pair standing at each end and a line of copy
 * between them.
 *
 * It is the only thing on the site that is not a product grid, and it exists
 * to break a long run of tiles into readable chapters. Two shoes, one line,
 * one link — anything more and it becomes a hero, which this shop does not
 * have.
 */
export function BannerStrip({
  left,
  right,
  headline,
  href,
  cta,
}: {
  left: Product;
  right: Product;
  headline: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="bg-mist">
      <div className="max-w-page mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-8 md:px-8 md:py-12">
        <BannerShoe product={left} className="justify-self-start" />

        <div className="text-center">
          <p className="text-title text-ink font-medium">{headline}</p>
          <Link
            href={href}
            className="link-quiet text-caption text-ink mt-3 inline-block uppercase"
          >
            {cta} →
          </Link>
        </div>

        <BannerShoe product={right} className="justify-self-end" />
      </div>
    </section>
  );
}

/**
 * Decorative on purpose. The pair is illustrating the band, not being offered
 * in it — the link in the middle is the whole point of the section, and a
 * screen reader hearing three destinations here would have to work out which
 * one the band is actually for.
 */
function BannerShoe({ product, className }: { product: Product; className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <div className="relative hidden h-20 w-28 sm:block md:h-28 md:w-40">
        <Image src={product.image} alt="" fill sizes="160px" className="object-contain" />
      </div>
    </div>
  );
}
