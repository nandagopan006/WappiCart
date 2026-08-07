import { ImageResponse } from "next/og";

import { palette } from "@/lib/palette";
import { formatPriceForImage, getProduct, products } from "@/lib/products";
import { shop } from "@/lib/shop";

/**
 * The preview card a shopper sees when they forward a pair to a friend on
 * WhatsApp. A line and a price, nothing else.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `A pair at ${shop.name}`;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

/* This renders to a PNG outside the browser, so it cannot read a CSS token.
   lib/palette.ts is the one module allowed to hold the literals. */
const { blush, espresso, muted } = palette;

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: blush,
          color: espresso,
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: muted }}>
          {shop.name.toUpperCase()}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, lineHeight: 1 }}>{product?.name ?? shop.name}</div>
          <div style={{ display: "flex", height: 2, backgroundColor: muted, opacity: 0.3, marginTop: 40 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 24,
              fontSize: 34,
            }}
          >
            <span style={{ color: espresso }}>{product ? formatPriceForImage(product.price) : ""}</span>
            <span style={{ color: muted }}>{product ? `Sizes ${product.sizes.join(" ")}` : ""}</span>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: muted }}>Order on WhatsApp</div>
      </div>
    ),
    size,
  );
}
