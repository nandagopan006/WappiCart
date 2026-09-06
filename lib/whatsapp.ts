import { formatPrice, type Product } from "./catalogue";

/**
 * The only conversion path on the site. It must never break.
 * Test on a real phone after any change to this file.
 *
 * ── Why nothing is imported from lib/shop any more ───────────────────────
 * It used to default `phone` to `shop.phone`. `lib/shop.ts` now reads the
 * database and is marked `server-only`, and two of this module's callers —
 * `OrderButton` and `Catalog` — are Client Components. Importing it here
 * would drag a database handle toward the browser and fail the build.
 *
 * So the shop's identity is passed in. That is better than a default anyway:
 * the phone number is the one value that must never silently be wrong, and a
 * function that quietly falls back to a placeholder when a caller forgets is
 * how a shop discovers at the end of the week that no orders arrived.
 */

/** The parts of the shop a WhatsApp message needs. */
export type ShopContact = {
  name: string;
  /** Country code + number. Non-digits are stripped before use. */
  phone: string;
  /** No trailing slash. */
  url: string;
};

/** wa.me accepts digits only — strip `+`, spaces, dashes and brackets. */
function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function link(phone: string, message: string): string {
  // An unencoded `&` silently truncates the message.
  return `https://wa.me/${normalisePhone(phone)}?text=${encodeURIComponent(message)}`;
}

/**
 * The order link. The message carries name, size, price and SKU so the shop
 * owner never has to ask "which one?".
 *
 * The button says "Order on WhatsApp", so the chat opens with "I want to
 * order". Same words all the way through.
 */
export function buildOrderLink({
  product,
  size,
  shop,
}: {
  product: Product;
  size: number;
  shop: ShopContact;
}): string {
  const message = [
    `Hi ${shop.name}, I want to order:`,
    "",
    product.name,
    `Size ${size}`,
    formatPrice(product.price),
    product.sku,
    "",
    `${shop.url}/p/${product.slug}`,
  ].join("\n");

  return link(shop.phone, message);
}

/**
 * Used by the empty filter state — the shopper has narrowed to something the
 * shelf does not have. The sizes they picked go into the message, so the shop
 * can answer without asking them to repeat themselves.
 */
export function buildStockEnquiryLink({
  sizes = [],
  category,
  shop,
}: {
  sizes?: number[];
  category?: string;
  shop: ShopContact;
}): string {
  const what = category ?? "anything";
  const inSizes =
    sizes.length === 0 ? "" : sizes.length === 1 ? ` in size ${sizes[0]}` : ` in sizes ${sizes.join(", ")}`;

  return link(shop.phone, `Hi ${shop.name}, do you have ${what}${inSizes}?`);
}

/** Footer and about page — a plain way in with no product attached. */
export function buildChatLink(shop: ShopContact): string {
  return link(shop.phone, `Hi ${shop.name}, I have a question.`);
}
