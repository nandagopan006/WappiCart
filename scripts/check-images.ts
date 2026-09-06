/** Fetches every product image URL and reports any that do not load. */
import { asc, eq } from "drizzle-orm";
import { productImages, products } from "../lib/db/schema";
import { connect } from "./db-connect";

async function main() {
  const { db, close } = connect();
  try {
    const rows = await db
      .select({
        slug: products.slug,
        status: products.status,
        url: productImages.url,
        alt: productImages.alt,
        position: productImages.position,
      })
      .from(productImages)
      .innerJoin(products, eq(products.id, productImages.productId))
      .orderBy(asc(products.slug), asc(productImages.position));

    console.log(`\n  Checking ${rows.length} image(s)...\n`);

    let bad = 0;
    let shortAlt = 0;

    for (const row of rows) {
      if (row.alt.trim().length < 20) {
        shortAlt += 1;
        console.log(`  SHORT ALT  ${row.slug} [${row.position}] — "${row.alt}"`);
      }

      try {
        const res = await fetch(row.url, { method: "HEAD", redirect: "follow" });
        if (!res.ok) {
          bad += 1;
          console.log(`  ${res.status}  ${row.slug} [${row.position}]  ${row.url.slice(0, 70)}`);
        }
      } catch {
        bad += 1;
        console.log(`  UNREACHABLE  ${row.slug} [${row.position}]  ${row.url.slice(0, 70)}`);
      }
    }

    const published = rows.filter((r) => r.status === "published");
    const byProduct = new Map<string, number>();
    for (const r of published) byProduct.set(r.slug, (byProduct.get(r.slug) ?? 0) + 1);
    const tooFew = [...byProduct.entries()].filter(([, n]) => n < 2);

    for (const [slug, n] of tooFew) console.log(`  TOO FEW IMAGES  ${slug} has ${n}`);

    console.log(
      bad === 0 && shortAlt === 0 && tooFew.length === 0
        ? `\n  All ${rows.length} images load, all alt text is long enough.\n`
        : `\n  ${bad} unreachable, ${shortAlt} short alt, ${tooFew.length} product(s) with too few.\n`,
    );
    process.exitCode = bad + shortAlt + tooFew.length === 0 ? 0 : 1;
  } finally {
    await close();
  }
}
main().catch((e) => { console.error("Failed:", (e as Error).message); process.exit(1); });
