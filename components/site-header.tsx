import Link from "next/link";

import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { WishlistLink } from "@/components/wishlist-link";
import { Wordmark } from "@/components/wordmark";
import { getShelves } from "@/lib/repositories/categories";
import { getShop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * Wordmark on its own line, shelves under it, the one way to buy on the right.
 *
 * There is no search, no login, no wishlist and no cart icon, because this
 * shop has none of those things. Putting them here would be decoration
 * pretending to be function — the whole site is built so the only control that
 * matters is the WhatsApp link.
 *
 * A plain static bar. It does not shrink on scroll, it does not blur, and it
 * does not animate in: a catalogue header's job is to name the shop and get
 * out of the way of the photographs.
 */
export async function SiteHeader() {
  /* Sequential, not Promise.all: the transaction pooler resets a connection
     asked to pipeline two reads down it at once. */
  const shop = await getShop();
  const shelves = await getShelves();

  return (
    <header className="border-line bg-paper sticky top-0 z-40 border-b">
      <div className="max-w-page mx-auto px-4 md:px-8">
        {/* Row one — the wordmark, centred, with the order link held to the
            right edge. */}
        <div className="relative flex h-14 items-center justify-center">
          {/* The mark. Defined once in `Wordmark` so the bar and the brand
              intro can never drift apart. */}
          <Link href="/" className="text-ink" aria-label={`${shop.name} — home`}>
            <Wordmark name={shop.name} />
          </Link>

          <div className="text-caption absolute right-0 flex items-center gap-4 uppercase">
            <Link href="/about" className="link-quiet text-grey hover:text-ink hidden sm:block">
              About
            </Link>
            {/* Shown at every width — the heart is on every tile, so the way
                back to what it saved has to be reachable on a phone too. */}
            <WishlistLink />
            <a
              href={buildChatLink(shop)}
              target="_blank"
              rel="noopener noreferrer"
              className="link-quiet text-ink flex items-center gap-1.5"
            >
              <WhatsappGlyph className="text-whatsapp" />
              <span className="hidden sm:inline">Order</span>
            </a>
          </div>
        </div>

        {/* Row two — the shelves. A horizontal rule above them, so the two rows
            read as one bar rather than two stacked ones.

            Desktop only. On a phone the bottom bar is the navigation, and two
            sets of controls on one screen is one set too many. The shelves are
            still one tap away there: the bottom bar's Shop opens /shop, which
            carries the same names in its own filter row.

            The shelves come from the database and only the visible ones are
            returned, so hiding one in the admin takes it out of here too. */}
        <nav className="border-line text-caption hidden items-center justify-center gap-6 border-t py-3 uppercase sm:gap-9 md:flex">
          <Link href="/shop" className="link-quiet text-grey hover:text-ink">
            All
          </Link>
          {shelves.map((shelf) => (
            <Link
              key={shelf.slug}
              href={`/shop?c=${shelf.slug}`}
              className="link-quiet text-grey hover:text-ink"
            >
              {shelf.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
