import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product-detail";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { formatPrice, getProduct, publishedProducts, relatedProducts } from "@/lib/products";
import { getAllShelves } from "@/lib/repositories/categories";
import { getShop } from "@/lib/shop";

type Params = { params: Promise<{ slug: string }> };

/* Published pairs only — a draft has no page to prerender, and an archived
   one keeps its URL but is served as a 404 by `getProduct` below. */
export async function generateStaticParams() {
  return (await publishedProducts()).map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  /* Sequential, not Promise.all: the transaction pooler resets a connection
     asked to pipeline two reads down it at once. */
  const product = await getProduct(slug);
  const shop = await getShop();

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
  /* Sequential, not Promise.all: the transaction pooler resets a connection
     asked to pipeline two reads down it at once. */
  const product = await getProduct(slug);
  const shop = await getShop();

  if (!product) notFound();

  const related = await relatedProducts(product, 4);

  /* The shelf's readable name. Hidden shelves included: a published pair on a
     shelf that is currently off still has its own page, and naming it by slug
     there would print "running-shoes" at a shopper. Falls back to the slug if
     the row has somehow gone. */
  const shelves = await getAllShelves();
  const categoryLabel = shelves.find((s) => s.slug === product.category)?.name ?? product.category;

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
    category: categoryLabel,
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
    <div className="max-w-page mx-auto px-4 pt-6 pb-section md:px-8 md:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/shop" className="link-quiet text-caption text-grey hover:text-ink mb-8 inline-block uppercase">
        ← All shoes
      </Link>

      <ProductDetail
        product={product}
        categoryLabel={categoryLabel}
        shop={shop}
        headingLevel="h1"
        imagePriority
      />

      {related.length > 0 ? (
        <section className="mt-section">
          <SectionHeading>More in {categoryLabel}</SectionHeading>
          <ProductGrid products={related} className="mt-10" priorityCount={0} />
        </section>
      ) : null}
    </div>
  );
}
