import { ImageResponse } from "next/og";

import { palette } from "@/lib/palette";
import { pairsInStock } from "@/lib/products";
import { BRAND_FALLBACK, getShop } from "@/lib/shop";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/* Static because Next reads this at module load, where nothing can be
   awaited. The image itself renders the live shop name. */
export const alt = `${BRAND_FALLBACK.name} — ${BRAND_FALLBACK.tagline}`;

/* Literals come from lib/palette.ts — see the note in
   app/p/[slug]/opengraph-image.tsx. */
const { paper, ink, grey, line } = palette;

export default async function OpengraphImage() {
  /* Both awaited up front — a Promise rendered into ImageResponse fails at
     prerender with an unhelpful "cannot read properties of undefined". */
  const shop = await getShop();
  const pairs = await pairsInStock();

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
          <div style={{ display: "flex", fontSize: 92, lineHeight: 1.05, maxWidth: 900 }}>{shop.tagline}</div>
          <div style={{ display: "flex", height: 1, backgroundColor: line, marginTop: 40 }} />
        </div>

        <div style={{ display: "flex", fontSize: 28, color: grey }}>
          {pairs} pairs in stock
        </div>
      </div>
    ),
    size,
  );
}
