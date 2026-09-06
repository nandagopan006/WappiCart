/**
 * Checks the database is internally consistent.
 *
 *   npm run db:verify
 *
 * It used to assert fixed counts — "there must be exactly 12 products" — which
 * was right on the day the catalogue was migrated and wrong every day after,
 * because adding a product is not a bug. So it now checks the rules that stay
 * true however the shop grows.
 *
 * Counts are still printed, just as information rather than as pass/fail.
 * Prints no product data, so the output is safe to paste anywhere.
 */
import { sql } from "drizzle-orm";

import { connect } from "./db-connect";

type Check = { label: string; sql: string; expect: (n: number) => boolean; hint: string };

/* Each of these counts something that should be ZERO. A non-zero result names
   a real problem a shopper could run into. */
const PROBLEMS: Check[] = [
  {
    label: "published products with fewer than 2 photographs",
    sql: `select count(*)::int as n from products p
          where p.status = 'published'
            and (select count(*) from product_images i where i.product_id = p.id) < 2`,
    expect: (n) => n === 0,
    hint: "The product page and the share card both expect at least two views.",
  },
  {
    label: "published products with no sizes in stock",
    sql: `select count(*)::int as n from products p
          where p.status = 'published'
            and not exists (select 1 from product_sizes s where s.product_id = p.id)`,
    expect: (n) => n === 0,
    hint: "Nothing a shopper could actually order. Archive it instead.",
  },
  {
    label: "products whose category no longer exists",
    sql: `select count(*)::int as n from products p
          where not exists (select 1 from categories c where c.slug = p.category_slug)`,
    expect: (n) => n === 0,
    hint: "The shelf was removed without moving its shoes.",
  },
  {
    label: "images with alt text under 20 characters",
    sql: `select count(*)::int as n from product_images where char_length(alt) < 20`,
    expect: (n) => n === 0,
    hint: "Screen readers get nothing useful from these.",
  },
  {
    label: "products with an MRP at or below the price",
    sql: `select count(*)::int as n from products where mrp is not null and mrp <= price`,
    expect: (n) => n === 0,
    hint: "That is not a discount, it is a typo.",
  },
  {
    label: "home page sections sharing a position",
    sql: `select (count(*) - count(distinct position))::int as n from homepage_sections`,
    expect: (n) => n === 0,
    hint: "Two blocks claiming the same slot on the page.",
  },
  {
    label: "settings rows missing",
    sql: `select (3
            - (select count(*) from shop_settings)
            - (select count(*) from seo_settings)
            - (select count(*) from about_content))::int as n`,
    expect: (n) => n === 0,
    hint: "Run npm run db:seed to create them.",
  },
];

const COUNTS: { label: string; sql: string }[] = [
  { label: "products (all)", sql: "select count(*)::int as n from products" },
  { label: "  published", sql: "select count(*)::int as n from products where status = 'published'" },
  { label: "  draft", sql: "select count(*)::int as n from products where status = 'draft'" },
  { label: "  archived", sql: "select count(*)::int as n from products where status = 'archived'" },
  { label: "photographs", sql: "select count(*)::int as n from product_images" },
  { label: "orderable pairs", sql: "select count(*)::int as n from product_sizes" },
  { label: "categories", sql: "select count(*)::int as n from categories" },
  { label: "home page sections", sql: "select count(*)::int as n from homepage_sections" },
  { label: "admin accounts", sql: "select count(*)::int as n from admin_profiles" },
];

async function main() {
  const { db, close } = connect();

  try {
    const read = async (statement: string) => {
      const rows = await db.execute(sql.raw(statement));
      return Number((rows as unknown as { n: number }[])[0]?.n ?? 0);
    };

    console.log("\n  Counts\n");
    for (const c of COUNTS) {
      console.log(`    ${c.label.padEnd(22)} ${String(await read(c.sql)).padStart(5)}`);
    }

    console.log("\n  Integrity\n");
    let failures = 0;
    for (const check of PROBLEMS) {
      const n = await read(check.sql);
      const ok = check.expect(n);
      if (!ok) failures += 1;
      console.log(`    ${ok ? "OK  " : "FAIL"}  ${check.label}${ok ? "" : `: ${n}`}`);
      if (!ok) console.log(`          ${check.hint}`);
    }

    /* ── The size the storefront is designed for ────────────────────── */

    /* Every storefront page loads the whole catalogue, and /shop sends all of
       it to the browser. At a dozen products that is genuinely faster than
       several queries. It stops being true somewhere past a hundred, and
       nothing will announce that — the pages just quietly get heavier. So the
       check says it out loud, well before it starts to hurt. */
    const published = await read(
      "select count(*)::int as n from products where status = 'published'",
    );

    const COMFORTABLE = 100;
    const STRAINED = 250;

    console.log("\n  Size\n");

    if (published < COMFORTABLE) {
      console.log(`    OK    ${published} published products — well within the design.`);
    } else if (published < STRAINED) {
      console.log(`    NOTE  ${published} published products.`);
      console.log("          The shop loads every product on every page and sends them all to");
      console.log("          the browser. Around this size it is worth moving /shop's filtering");
      console.log("          to the server — see `shown` in components/catalog.tsx and");
      console.log("          `loadCatalogue` in lib/products.ts. Both are marked as the seam.");
    } else {
      failures += 1;
      console.log(`    FAIL  ${published} published products is past what this design carries.`);
      console.log("          /shop now sends a large payload to every phone that opens it.");
      console.log("          Move filtering and paging to the server before adding more.");
    }

    console.log(
      failures === 0
        ? "\n  The database is consistent.\n"
        : `\n  ${failures} problem(s) found.\n`,
    );
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Verify failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
