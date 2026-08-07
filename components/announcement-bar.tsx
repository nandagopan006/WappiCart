import { shop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * The thin strip above everything. Two facts a shopper wants before they
 * scroll: what delivery costs, and how to reach a person.
 *
 * No countdown timer, no rotating carousel of offers. It says one true thing
 * and gives one way in.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-espresso text-blush">
      <div className="max-w-page font-mono text-utility mx-auto flex items-center justify-between gap-4 px-5 py-2.5 uppercase md:px-8">
        <p>Free delivery over ₹2,999</p>

        <div className="flex items-center gap-5">
          <p className="text-blush/60 hidden sm:block">{shop.deliveryAreas}</p>
          <a
            href={buildChatLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blush/70 whitespace-nowrap underline underline-offset-4 transition-colors"
          >
            Track an order
          </a>
        </div>
      </div>
    </div>
  );
}
