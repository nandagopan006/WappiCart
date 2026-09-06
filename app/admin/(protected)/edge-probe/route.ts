/**
 * Edge-case tests for the product form's rules.
 *
 * Everything here is a value a real person could type by accident: a pasted
 * paragraph in a name field, an emoji, a price with a decimal point, a string
 * of spaces. None of them should crash, and each should either be accepted
 * cleanly or refused with a sentence.
 *
 * Inert in production, like the lifecycle probe — it writes real rows.
 * Driven by `npm run check:edges`.
 */
import { eq, like } from "drizzle-orm";

import { saveProductAction } from "@/lib/actions/products";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityLogs, productImages, productSizes, products } from "@/lib/db/schema";
import { getEditableProduct } from "@/lib/repositories/product-write";

export const dynamic = "force-dynamic";

const PREFIX = "edge-probe";
const IMG = "https://images.unsplash.com/photo-1544441892-794166f1e3be?auto=format&w=800";

/** A complete, valid product. Each test bends one field out of shape. */
function base(slug: string) {
  return {
    slug,
    name: "Edge Probe",
    categorySlug: "sneakers",
    price: 1999,
    mrp: null,
    colour: "Test",
    material: "Test material",
    fitNote: null,
    description: "A probe product used by the edge-case checks.",
    care: "Delete it.",
    sku: `WPC-${slug.toUpperCase()}`,
    featured: false,
    isNew: false,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    images: [
      { url: IMG, alt: "Probe shoe in white leather, photographed from the side" },
      { url: IMG, alt: "Probe shoe in white leather, photographed from above" },
    ],
    sizes: [8, 9],
  };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  await requireAdmin();

  const out: string[] = [];
  const ok = (label: string, pass: boolean, extra = "") =>
    out.push(`${pass ? "OK  " : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);

  try {
    /* Each case: a description, the change, and whether it should be saved. */
    const cases: {
      label: string;
      patch: Record<string, unknown>;
      shouldSave: boolean;
    }[] = [
      { label: "name of 500 characters", patch: { name: "A".repeat(500) }, shouldSave: false },
      { label: "name at the 120 limit", patch: { name: "A".repeat(120) }, shouldSave: true },
      { label: "colour of 200 characters", patch: { colour: "x".repeat(200) }, shouldSave: false },
      { label: "material of 500 characters", patch: { material: "x".repeat(500) }, shouldSave: false },
      { label: "care note of 1000 characters", patch: { care: "x".repeat(1000) }, shouldSave: false },
      { label: "SKU of 100 characters", patch: { sku: "S".repeat(100) }, shouldSave: false },
      { label: "slug of 200 characters", patch: { slug: "a".repeat(200) }, shouldSave: false },
      { label: "alt text of 500 characters", patch: { images: [{ url: IMG, alt: "z".repeat(500) }, { url: IMG, alt: "A probe shoe seen from the side" }] }, shouldSave: false },
      { label: "price at the 10,00,000 limit", patch: { price: 1_000_000 }, shouldSave: true },
      { label: "price just over the limit", patch: { price: 1_000_001 }, shouldSave: false },
      { label: "MRP absurdly large", patch: { mrp: 9_999_999_999 }, shouldSave: false },
      { label: "price as Infinity", patch: { price: Number.POSITIVE_INFINITY }, shouldSave: false },
      { label: "price as NaN", patch: { price: Number.NaN }, shouldSave: false },
      { label: "price as null", patch: { price: null }, shouldSave: false },
      { label: "name that is only spaces", patch: { name: "     " }, shouldSave: false },
      { label: "emoji in the name", patch: { name: "Runner 👟 Low" }, shouldSave: true },
      { label: "accents in the name", patch: { name: "Chaussure à lacets" }, shouldSave: true },
      { label: "price with decimals", patch: { price: 19.99 }, shouldSave: false },
      { label: "price of zero", patch: { price: 0 }, shouldSave: false },
      { label: "negative price", patch: { price: -500 }, shouldSave: false },
      { label: "absurdly large price", patch: { price: 9_999_999_999 }, shouldSave: false },
      { label: "price as a string", patch: { price: "1999" }, shouldSave: false },
      { label: "slug with spaces", patch: { slug: "has spaces" }, shouldSave: false },
      { label: "slug in capitals", patch: { slug: "HasCapitals" }, shouldSave: false },
      { label: "slug with a slash", patch: { slug: "a/b" }, shouldSave: false },
      { label: "empty slug", patch: { slug: "" }, shouldSave: false },
      { label: "SKU that is only spaces", patch: { sku: "   " }, shouldSave: false },
      { label: "five photographs", patch: { images: Array(5).fill({ url: IMG, alt: "Probe shoe seen from the side, in white" }) }, shouldSave: false },
      { label: "the same size twice", patch: { sizes: [9, 9] }, shouldSave: false },
      { label: "sizes out of order", patch: { sizes: [10, 6, 8] }, shouldSave: true },
      { label: "no sizes at all (draft)", patch: { sizes: [] }, shouldSave: true },
      { label: "HTML in the description", patch: { description: "<script>alert(1)</script> A shoe." }, shouldSave: true },
      { label: "description over 2000 characters", patch: { description: "word ".repeat(2000) }, shouldSave: false },
      { label: "category that does not exist", patch: { categorySlug: "spaceboots" }, shouldSave: false },
    ];

    for (const [index, testCase] of cases.entries()) {
      const slug = `${PREFIX}-${index}`;
      const payload = { ...base(slug), ...testCase.patch };

      let saved = false;
      let message = "";
      try {
        const result = await saveProductAction(payload);
        saved = result.ok;
        message = result.ok ? "" : result.error;
      } catch (error) {
        /* A crash is always a failure, whatever the input. */
        ok(testCase.label, false, `threw: ${(error as Error).message.slice(0, 50)}`);
        continue;
      }

      ok(
        testCase.label,
        saved === testCase.shouldSave,
        saved ? "saved" : `refused: ${message.slice(0, 45)}`,
      );
    }

    /* A saved emoji name must come back out intact, not mangled. */
    const emojiIndex = cases.findIndex((c) => c.label === "emoji in the name");
    const emoji = await getEditableProduct(`${PREFIX}-${emojiIndex}`);
    ok("emoji survives the round trip", emoji?.name === "Runner 👟 Low", emoji?.name ?? "(missing)");

    /* HTML is stored as written — escaping is the renderer's job, not the
       database's. Storing it pre-escaped would double-escape on screen. */
    const htmlIndex = cases.findIndex((c) => c.label === "HTML in the description");
    const html = await getEditableProduct(`${PREFIX}-${htmlIndex}`);
    ok(
      "HTML is stored raw, for the renderer to escape",
      html?.description.startsWith("<script>") ?? false,
    );

    return Response.json({ out });
  } finally {
    /* Remove everything this route created, whatever happened. */
    const made = await db.select({ id: products.id }).from(products).where(like(products.slug, `${PREFIX}%`));
    for (const row of made) {
      await db.delete(productImages).where(eq(productImages.productId, row.id));
      await db.delete(productSizes).where(eq(productSizes.productId, row.id));
      await db.delete(activityLogs).where(eq(activityLogs.entityId, row.id));
      await db.delete(products).where(eq(products.id, row.id));
    }
  }
}
