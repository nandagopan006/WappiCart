import { formatPrice, type Product } from "./products";
import { shop } from "./shop";

/**
 * The only conversion path on the site. It must never break.
 * Test on a real phone after any change to this file.
 */

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
 * The button says "Order on WhatsApp", so the chat opens with "I want to order".
 * Same words all the way through.
 */
export function buildOrderLink({
  product,
  size,
  phone = shop.phone,
}: {
  product: Product;
  size: number;
  phone?: string;
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

  return link(phone, message);
}

/**
 * Used by the empty filter state — the shopper has narrowed to something the
 * shelf does not have. The sizes they picked go into the message, so the shop
 * can answer without asking them to repeat themselves.
 */
export function buildStockEnquiryLink({
  sizes = [],
  category,
  phone = shop.phone,
}: {
  sizes?: number[];
  category?: string;
  phone?: string;
}): string {
  const what = category ?? "anything";
  const inSizes =
    sizes.length === 0 ? "" : sizes.length === 1 ? ` in size ${sizes[0]}` : ` in sizes ${sizes.join(", ")}`;

  return link(phone, `Hi ${shop.name}, do you have ${what}${inSizes}?`);
}

/** Footer and about page — a plain way in with no product attached. */
export function buildChatLink({ phone = shop.phone }: { phone?: string } = {}): string {
  return link(phone, `Hi ${shop.name}, I have a question.`);
}
