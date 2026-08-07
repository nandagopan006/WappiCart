import { Magnetic } from "@/components/magnetic";
import { SplitText } from "@/components/split-text";
import { Wave } from "@/components/wave";
import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { shop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * The page closes on the one thing it has been asking for all the way down.
 *
 * ── Why this is not three columns of small print ─────────────────────────
 * It was: orders, delivery, returns, set in body text, and then the page
 * simply stopped. Everything above it had been building toward a conversation
 * and the last thing a visitor met was a list.
 *
 * So the closing line is set at display size and says the only instruction on
 * the site — and it is the link, not a heading above one. The practical
 * columns still sit underneath, smaller, where someone looking for the return
 * window will still find it in a second.
 *
 * No newsletter signup. You have WhatsApp — that is your list.
 */
export function SiteFooter() {
  return (
    <footer className="max-w-page mt-section mx-auto px-5 pb-16 md:px-8">
      <Wave />

      <div className="pt-14 pb-16 md:pt-20 md:pb-24">
        <p className="font-mono text-utility text-muted uppercase">No cart. No checkout.</p>

        <Magnetic strength={8}>
          <a
            href={buildChatLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 inline-block focus-visible:outline-offset-8"
          >
            <SplitText
              onScroll
              stagger={0.02}
              className="type-display text-espresso block text-[clamp(2.5rem,9vw,7rem)] leading-[0.9] tracking-[-0.03em]"
            >
              Order on WhatsApp
            </SplitText>

            <span className="text-muted group-hover:text-espresso mt-6 inline-flex items-center gap-3 transition-colors">
              <WhatsappGlyph className="text-whatsapp" />
              <span className="font-mono text-utility uppercase">
                +{shop.phone} · {shop.replyTime}
              </span>
              <span
                aria-hidden="true"
                className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </a>
        </Magnetic>
      </div>

      <Wave />

      <div className="grid gap-10 pt-10 md:grid-cols-3">
        <div>
          <p className="font-mono text-utility text-muted uppercase">Follow</p>
          <a
            href={shop.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-body mt-2 inline-block"
          >
            Instagram {shop.instagramHandle}
          </a>
        </div>

        <div>
          <p className="font-mono text-utility text-muted uppercase">Delivery</p>
          <p className="text-body mt-2">{shop.deliveryAreas}</p>
        </div>

        <div>
          <p className="font-mono text-utility text-muted uppercase">Returns</p>
          <p className="text-body mt-2">{shop.returnWindow}</p>
        </div>
      </div>

      <p className="font-mono text-utility text-muted mt-12 uppercase">{shop.name}, Kerala</p>
    </footer>
  );
}
