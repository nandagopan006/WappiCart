import { Marquee } from "@/components/marquee";
import { SplitText } from "@/components/split-text";

/**
 * The page stops selling for one screen.
 *
 * Two lines at display size and nothing else — no image, no button, no
 * supporting paragraph. It is the last place on the site that splits its
 * type, and it earns it by being the only thing on screen.
 *
 * Underneath, the brand line drifts sideways as the section passes. Scroll-
 * driven rather than looping: nothing moves while the visitor is still
 * reading, which is the difference between an accent and a ticker.
 */
export function BrandStatement({ index }: { index: number }) {
  return (
    <section className="border-line overflow-hidden border-y py-section">
      <div className="max-w-page mx-auto px-4 md:px-8">
        <p className="text-caption text-grey flex items-baseline gap-4 uppercase">
          <span aria-hidden="true" className="tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <span>What we are for</span>
        </p>

        <h2 className="text-display text-ink mt-8 font-light uppercase">
          <SplitText by="line" className="block">
            {"Less noise.\nBetter pairs."}
          </SplitText>
        </h2>
      </div>

      <Marquee mode="scroll" amount={220} className="mt-14 md:mt-20">
        <span className="text-caption text-grey px-6 uppercase">
          Kerala — curated for everyday movement — no cart, no checkout — order on WhatsApp —
        </span>
      </Marquee>
    </section>
  );
}
