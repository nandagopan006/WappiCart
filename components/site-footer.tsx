import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { shop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * Three columns of the practical facts, and the one link the whole site has
 * been asking for.
 *
 * No newsletter signup. You have WhatsApp — that is your list.
 */
export function SiteFooter() {
  return (
    <footer className="border-line bg-mist mt-section border-t">
      <div className="max-w-page mx-auto px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-caption text-ink mb-3 uppercase">Order</p>
            <a
              href={buildChatLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="link-quiet text-body text-ink inline-flex items-center gap-2"
            >
              <WhatsappGlyph className="text-whatsapp" />
              WhatsApp +{shop.phone}
            </a>
            <p className="text-body text-grey mt-2">{shop.replyTime}</p>
          </div>

          <div>
            <p className="text-caption text-ink mb-3 uppercase">Delivery</p>
            <p className="text-body text-grey">{shop.deliveryAreas}</p>
          </div>

          <div>
            <p className="text-caption text-ink mb-3 uppercase">Returns</p>
            <p className="text-body text-grey">{shop.returnWindow}</p>
          </div>

          <div>
            <p className="text-caption text-ink mb-3 uppercase">Follow</p>
            <a
              href={shop.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="link-quiet text-body text-grey hover:text-ink"
            >
              Instagram {shop.instagramHandle}
            </a>
          </div>
        </div>

        <p className="border-line text-caption text-grey mt-12 border-t pt-6 uppercase">
          {shop.name}, Kerala — no cart, no checkout
        </p>
      </div>
    </footer>
  );
}
