import { ImageResponse } from "next/og";

import { palette } from "@/lib/palette";
import { pairsInStock } from "@/lib/products";
import { shop } from "@/lib/shop";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${shop.name} — ${shop.tagline}`;

/* Literals come from lib/palette.ts — see the note in
   app/p/[slug]/opengraph-image.tsx. */
const { blush, espresso, muted } = palette;

export default function OpengraphImage() {
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
          <div style={{ display: "flex", fontSize: 92, lineHeight: 1.05, maxWidth: 900 }}>{shop.tagline}</div>
          <div style={{ display: "flex", height: 2, backgroundColor: muted, opacity: 0.3, marginTop: 40 }} />
        </div>

        <div style={{ display: "flex", fontSize: 28, color: muted }}>
          {pairsInStock()} pairs in stock
        </div>
      </div>
    ),
    size,
  );
}
