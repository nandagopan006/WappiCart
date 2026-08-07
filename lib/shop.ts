/**
 * Everything about the shop itself that is not a product.
 * Change it here, it changes everywhere.
 */

export const shop = {
  name: "WappiCart",
  tagline: "Shoes that arrive in a conversation.",

  /**
   * Country code + number, digits only. No `+`, no spaces, no dashes —
   * wa.me rejects anything else.
   *
   * Set NEXT_PUBLIC_WHATSAPP_PHONE in .env.local before going live.
   * The fallback below is a placeholder and will not reach anyone.
   */
  phone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "919000000000",

  instagram: "https://instagram.com/wappicart",
  instagramHandle: "@wappicart",

  deliveryAreas: "Kochi, Thrissur and Kozhikode in 2 days. Rest of India in 4–6.",
  returnWindow: "7 days, unworn, box intact.",

  /* The trust strip's third fact. Say a number you can actually hit — a shop
     that answers in an hour and promises minutes has made the promise worse. */
  replyTime: "We reply in about an hour, 9am to 9pm.",

  /** Used for canonical URLs, sitemap and OG tags. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wappicart.vercel.app",
} as const;
