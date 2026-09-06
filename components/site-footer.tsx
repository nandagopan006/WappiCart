import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { getShop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * The practical facts, and the one link the whole site has been asking for.
 *
 * ── The mobile layout ────────────────────────────────────────────────────
 * Four full-width blocks stacked with a 40px gutter made the footer nearly a
 * screen tall on a phone — the last thing a shopper met was a column of
 * headings they had to scroll through. So the grid is two columns from the
 * smallest width up, and each block claims the span its content actually
 * needs:
 *
 *   Order      full width — it carries a link and a reply time
 *   Delivery   full width — the longest sentence here; in a half column on a
 *              360px screen it wraps to six lines and undoes the saving
 *   Returns    half, paired with
 *   Follow     half
 *
 * Three rows instead of four, on tighter gutters. It resolves to a plain
 * four-across row from `lg`, which is what a desktop footer wants.
 *
 * No newsletter signup. You have WhatsApp — that is your list.
 */
export async function SiteFooter() {
  const shop = await getShop();

  return (
    <footer className="border-line bg-mist mt-section border-t">
      <div className="max-w-page mx-auto px-4 py-10 md:px-8 md:py-16">
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:gap-y-10 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-caption text-ink mb-2 uppercase">Order</p>
            <a
              href={buildChatLink(shop)}
              target="_blank"
              rel="noopener noreferrer"
              className="link-quiet text-body text-ink inline-flex items-center gap-2"
            >
              <WhatsappGlyph className="text-whatsapp shrink-0" />
              <span className="tabular-nums">+{shop.phone}</span>
            </a>
            <p className="text-body text-grey mt-1">{shop.replyTime}</p>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <p className="text-caption text-ink mb-2 uppercase">Delivery</p>
            <p className="text-body text-grey">{shop.deliveryAreas}</p>
          </div>

          <div>
            <p className="text-caption text-ink mb-2 uppercase">Returns</p>
            <p className="text-body text-grey">{shop.returnWindow}</p>
          </div>

          <div>
            <p className="text-caption text-ink mb-2 uppercase">Follow</p>
            <a
              href={shop.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="link-quiet text-body text-grey hover:text-ink"
            >
              {shop.instagramHandle}
            </a>
          </div>
        </div>

        {/* The sign-off. Wraps to two lines on a narrow phone rather than
            running off the edge, and keeps its own space above the fold of
            the viewport. */}
        <p className="border-line text-caption text-grey mt-8 flex flex-wrap gap-x-2 border-t pt-5 uppercase md:mt-12 md:pt-6">
          <span>{shop.name}, Kerala</span>
          <span aria-hidden="true">—</span>
          <span>No cart, no checkout</span>
        </p>
      </div>
    </footer>
  );
}
