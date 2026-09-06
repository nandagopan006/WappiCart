import type { MetadataRoute } from "next";

import { getShop } from "@/lib/shop";

/**
 * What crawlers may look at.
 *
 * The shop is open; two things are not:
 *
 *   /admin     already returns a redirect to anyone not signed in, and every
 *              page carries a noindex tag. This line is the cheap third layer
 *              — a crawler that ignores robots.txt still hits the other two.
 *   /wishlist  lives in one browser's storage, so no two visitors would see
 *              the same page and there is nothing to index.
 *
 * The sitemap address comes from the shop's Site URL setting, so remember to
 * change that at /admin/settings when you deploy — not just .env.local.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const shop = await getShop();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/wishlist"],
    },
    sitemap: `${shop.url}/sitemap.xml`,
  };
}
