import { Marquee } from "@/components/marquee";
import { ProximityText } from "@/components/proximity-text";
import { ScrollReveal } from "@/components/scroll-reveal";

/**
 * The page stops selling for one screen.
 *
 * Two lines at display size and nothing else — no image, no button, no
 * supporting paragraph. It earns the size by being the only thing on screen.
 *
 * The break between the lines is authored, not left to the box: `\n` in the
 * string forces it, so the statement reads as two sentences at every width
 * instead of running together into one when the container is wide enough to
 * hold it.
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

        <ScrollReveal className="mt-8">
          <ProximityText as="h2" className="text-display text-ink font-light uppercase">
            {"Less noise.\nBetter pairs."}
          </ProximityText>
        </ScrollReveal>
      </div>

      <Marquee mode="scroll" amount={220} className="mt-14 md:mt-20">
        <span className="text-caption text-grey px-6 uppercase">
          Kerala — curated for everyday movement — no cart, no checkout — order on WhatsApp —
        </span>
      </Marquee>
    </section>
  );
}
