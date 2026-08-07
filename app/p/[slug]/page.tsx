import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product-detail";
import { formatPrice, getProduct, products } from "@/lib/products";
import { shop } from "@/lib/shop";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) return { title: "Pair not found" };

  const description = product.description;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ${formatPrice(product.price)}`,
      description,
      url: `${shop.url}/p/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

  /* Product schema so the price and availability show up in search, and so a
     forwarded link previews as a shoe rather than a bare URL. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    color: product.colour,
    material: product.material,
    /* Product images may be a path inside /public or an absolute CDN URL.
       Prefixing the site origin onto an absolute URL produces a broken one, and
       a broken image in structured data costs the rich result silently. */
    image: product.image.startsWith("http") ? product.image : `${shop.url}${product.image}`,
    category: product.category,
    brand: { "@type": "Brand", name: shop.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: "https://schema.org/InStock",
      url: `${shop.url}/p/${product.slug}`,
      seller: { "@type": "Organization", name: shop.name },
    },
  };

  return (
    <article className="mx-auto max-w-[560px] px-5 pt-6 pb-16 md:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link
        href="/shop"
        className="font-mono text-utility text-muted hover:text-espresso mb-8 inline-block uppercase transition-colors"
      >
        ← All shoes
      </Link>

      <ProductDetail product={product} headingLevel="h1" imagePriority />
    </article>
  );
}
