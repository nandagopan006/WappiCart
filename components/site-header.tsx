import Link from "next/link";

import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { CATEGORIES } from "@/lib/products";
import { shop } from "@/lib/shop";
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
export function SiteHeader() {
  return (
    <header className="border-line bg-paper sticky top-0 z-40 border-b">
      <div className="max-w-page mx-auto px-4 md:px-8">
        {/* Row one — the wordmark, centred, with the order link held to the
            right edge. */}
        <div className="relative flex h-14 items-center justify-center">
          <Link
            href="/"
            className="text-title text-ink font-medium tracking-[0.3em] uppercase"
          >
            {shop.name}
          </Link>

          <div className="text-caption absolute right-0 flex items-center gap-4 uppercase">
            <Link href="/about" className="link-quiet text-grey hover:text-ink hidden sm:block">
              About
            </Link>
            <a
              href={buildChatLink()}
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
            read as one bar rather than two stacked ones. */}
        <nav className="border-line text-caption flex items-center justify-center gap-6 border-t py-3 uppercase sm:gap-9">
          <Link href="/shop" className="link-quiet text-grey hover:text-ink">
            All
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/shop?c=${category}`}
              className="link-quiet text-grey hover:text-ink"
            >
              {category}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
