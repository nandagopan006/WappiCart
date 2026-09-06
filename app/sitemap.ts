import type { MetadataRoute } from "next";

import { publishedProducts } from "@/lib/products";
import { getShop } from "@/lib/shop";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* Published pairs only. A draft or an archived product in the sitemap is an
     invitation for a crawler to index a 404. */
  const shop = await getShop();
  const products = await publishedProducts();

  return [
    { url: shop.url, changeFrequency: "weekly", priority: 1 },
    { url: `${shop.url}/shop`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${shop.url}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...products.map((product) => ({
      url: `${shop.url}/p/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
