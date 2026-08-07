import Image from "next/image";
import Link from "next/link";

import { Magnetic } from "@/components/magnetic";
import { Parallax } from "@/components/parallax";
import { Rise } from "@/components/rise";
import { SplitText } from "@/components/split-text";
import type { Product } from "@/lib/products";

/**
 * One full-bleed photograph with a line of type over it.
 *
 * The page needs somewhere the eye can rest between two grids, and a banner
 * does that better than more space. The copy earns its place by saying
 * something true about how the shop works rather than announcing a season.
 */
export function EditorialBanner({ product }: { product: Product }) {
  return (
    /* No top margin: this sits directly under the dark category band, and a
       strip of blush between two full-bleed sections reads as a gap rather
       than as breathing room. */
    <section className="relative">
      <div className="relative min-h-[26rem] overflow-hidden md:min-h-[34rem]">
        {/* A full-bleed image is where parallax earns the most — it has the
            height for real travel, and the type sitting on it stays put, which
            is what separates the two planes. */}
        <Parallax distance={60} className="absolute inset-0">
          <div className="absolute inset-0">
            <Image
              src={product.images[1] ?? product.image}
              alt={product.alt}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Parallax>

        {/* Espresso from the left so the type always has something to sit on,
            whatever the photograph does behind it. */}
        <div
          aria-hidden="true"
          className="from-espresso/85 via-espresso/45 absolute inset-0 bg-gradient-to-r to-transparent"
        />

        <div className="max-w-page relative mx-auto flex min-h-[26rem] items-center px-5 py-16 md:min-h-[34rem] md:px-8">
          <div className="text-blush max-w-[38ch]">
            <Rise>
              <p className="font-mono text-utility text-blush/70 uppercase">No cart, no checkout</p>
            </Rise>

            <SplitText as="h2" onScroll stagger={0.02} className="type-heading text-h2 mt-4 block">
              Pick a pair. Send one message.
            </SplitText>

            <Rise index={1}>
              <p className="text-body text-blush/80 mt-4">
                Choose your size and the button opens WhatsApp with the shoe, the size and the price
                already written. We confirm the fit and send payment details in the same chat.
              </p>
            </Rise>

            <Rise index={2} className="mt-8">
              <Magnetic>
                <Link
                  href="/shop"
                  className="bg-blush text-espresso text-body group inline-flex h-14 items-center gap-3 rounded-full px-9 font-medium focus-visible:outline-offset-4"
                >
                  <span data-magnetic-label className="inline-flex items-center gap-3">
                    Start browsing
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </Magnetic>
            </Rise>
          </div>
        </div>
      </div>
    </section>
  );
}
