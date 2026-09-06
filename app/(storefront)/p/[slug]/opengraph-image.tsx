import { ImageResponse } from "next/og";

import { palette } from "@/lib/palette";
import { formatPriceForImage, getProduct, publishedProducts } from "@/lib/products";
import { BRAND_FALLBACK, getShop } from "@/lib/shop";

/**
 * The preview card a shopper sees when they forward a pair to a friend on
 * WhatsApp. A line and a price, nothing else.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/* Static — see the note in app/(storefront)/opengraph-image.tsx. */
export const alt = `A pair at ${BRAND_FALLBACK.name}`;

export async function generateStaticParams() {
  return (await publishedProducts()).map((product) => ({ slug: product.slug }));
}

/* This renders to a PNG outside the browser, so it cannot read a CSS token.
   lib/palette.ts is the one module allowed to hold the literals. */
const { paper, ink, grey, line } = palette;

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const shop = await getShop();
  const { slug } = await params;
  const product = await getProduct(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: paper,
          color: ink,
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, color: grey }}>
          {shop.name.toUpperCase()}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, lineHeight: 1 }}>{product?.name ?? shop.name}</div>
          <div style={{ display: "flex", height: 1, backgroundColor: line, marginTop: 40 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 24,
              fontSize: 34,
            }}
          >
            <span style={{ color: ink }}>{product ? formatPriceForImage(product.price) : ""}</span>
            <span style={{ color: grey }}>{product ? `Sizes ${product.sizes.join(" ")}` : ""}</span>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: grey }}>Order on WhatsApp</div>
      </div>
    ),
    size,
  );
}
