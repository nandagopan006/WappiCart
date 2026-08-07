import type { MetadataRoute } from "next";

import { products } from "@/lib/products";
import { shop } from "@/lib/shop";

export default function sitemap(): MetadataRoute.Sitemap {
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
