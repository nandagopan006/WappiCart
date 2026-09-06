/**
 * Verifies the one thing on this site that must never break: the order link.
 * Builds it from real database rows, then decodes it back.
 */
import { asc, eq, inArray } from "drizzle-orm";

import { formatPrice } from "../lib/catalogue";
import { productImages, productSizes, products, shopSettings } from "../lib/db/schema";
import { buildOrderLink, buildStockEnquiryLink } from "../lib/whatsapp";
import { connect } from "./db-connect";

async function main() {
  const { db, close } = connect();
  try {
    const [settings] = await db.select().from(shopSettings).limit(1);
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.status, "published"))
      .orderBy(asc(products.position))
      .limit(1);

    const images = await db.select().from(productImages).where(eq(productImages.productId, row.id));
    const sizes = await db.select().from(productSizes).where(inArray(productSizes.productId, [row.id]));

    const shop = { name: settings.name, phone: settings.whatsappPhone, url: settings.siteUrl };
    const product = {
      slug: row.slug, name: row.name, category: row.categorySlug as never,
      price: row.price, images: images.map((i) => i.url), image: images[0].url,
      alt: images[0].alt, sizes: sizes.map((s) => s.size), colour: row.colour,
      material: row.material, description: row.description, care: row.care, sku: row.sku,
    };

    const size = product.sizes.sort((a, b) => a - b)[0];
    const link = buildOrderLink({ product, size, shop });
    const decoded = decodeURIComponent(link.split("?text=")[1]);

    console.log("\nORDER LINK");
    console.log("  wa.me/" + link.split("/")[3].split("?")[0]);
    console.log("\n" + decoded.split("\n").map((l) => "  | " + l).join("\n"));

    const checks: [string, boolean][] = [
      ["contains product name", decoded.includes(product.name)],
      ["contains size", decoded.includes(`Size ${size}`)],
      ["contains price", decoded.includes(formatPrice(product.price))],
      ["contains SKU", decoded.includes(product.sku)],
      ["contains product URL", decoded.includes(`${shop.url}/p/${product.slug}`)],
      ["phone is digits only", /^\d+$/.test(link.split("/")[3].split("?")[0])],
      ["message is URL-encoded", link.includes("%20") || link.includes("%0A")],
      ["no unencoded ampersand", !link.split("?text=")[1].includes("&")],
    ];

    console.log();
    let bad = 0;
    for (const [label, ok] of checks) {
      if (!ok) bad += 1;
      console.log(`  ${ok ? "OK  " : "FAIL"}  ${label}`);
    }

    const enquiry = buildStockEnquiryLink({ sizes: [9, 10], category: "loafers", shop });
    console.log("\n  enquiry: " + decodeURIComponent(enquiry.split("?text=")[1]));

    if (shop.phone === "919000000000") {
      console.log("\n  WARNING: the shop's WhatsApp number is still the placeholder.");
      console.log("           Orders would reach nobody. Set a real number before going live.");
    }

    console.log(bad === 0 ? "\n  Order path verified.\n" : `\n  ${bad} failure(s).\n`);
    process.exitCode = bad === 0 ? 0 : 1;
  } finally {
    await close();
  }
}

main().catch((e) => { console.error("Failed:", e instanceof Error ? e.message : e); process.exit(1); });
