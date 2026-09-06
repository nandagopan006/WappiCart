import type { Metadata } from "next";
import Image from "next/image";

import { SectionHeading } from "@/components/section-heading";
import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { getProduct, publishedProducts } from "@/lib/products";
import type { Product } from "@/lib/catalogue";
import { getAbout } from "@/lib/repositories/settings";
import { getShop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();

  return {
    title: "About",
    description: `Who runs ${shop.name}, where it ships, and how returns work.`,
    alternates: { canonical: "/about" },
  };
}

/**
 * The page where somebody decides whether to trust a shop that has no cart
 * with their money.
 *
 * So it is factual, short, and set as a specification rather than prose — the
 * delivery areas, the return conditions and the hours we answer in are the
 * reason anyone opens this page, and a returns policy read as a table is
 * easier to trust than one read as a paragraph.
 */

/** Chosen by slug for how it looks, with a positional fallback so a change in
    products.json can never leave a hole in the page. */
async function plate(slug: string, index: number): Promise<Product | undefined> {
  const chosen = await getProduct(slug);
  const catalogue = await publishedProducts();
  return chosen ?? catalogue[index % Math.max(catalogue.length, 1)];
}

export default async function AboutPage() {
  /* Sequential — the transaction pooler resets a connection asked to
     pipeline concurrent queries. */
  const shop = await getShop();
  const about = await getAbout();
  const portrait = await plate("brogue-wing-chestnut", 0);

  /* Each fact falls back to the shop setting it restates. The About screen
     lets an editor say something more specific here without having to repeat
     the shop's own delivery line when they do not want to. */
  const facts = [
    { term: "Delivery", value: about.deliveryInfo || shop.deliveryAreas },
    {
      term: "Returns",
      value:
        about.returnsInfo || `${shop.returnWindow} Message us first and we arrange the pickup.`,
    },
    { term: "We answer", value: about.hours || shop.replyTime },
    { term: "Photography", value: about.photographyNote },
  ].filter((fact) => fact.value.trim().length > 0);

  /* Blank lines separate paragraphs, which is how the editor writes them. */
  const paragraphs = about.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="max-w-page mx-auto px-4 pt-10 pb-section md:px-8 md:pt-14">
      <SectionHeading as="h1">About the shop</SectionHeading>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="bg-mist relative aspect-4/3 overflow-hidden">
          <Image
            src={portrait?.image ?? ""}
            alt={portrait?.alt ?? ""}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="max-w-[46ch]">
          <p className="text-title text-ink font-medium">{about.headline}</p>
          {paragraphs.map((paragraph, i) => (
            <p key={i} className={i === 0 ? "text-body text-grey mt-5" : "text-body text-grey mt-4"}>
              {paragraph}
            </p>
          ))}

          <a
            href={buildChatLink(shop)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption border-ink bg-ink text-paper hover:bg-paper hover:text-ink mt-8 inline-flex h-13 items-center gap-2 border px-8 uppercase transition-colors"
          >
            <WhatsappGlyph className="text-whatsapp" />
            Message the shop
          </a>
        </div>
      </div>

      <SectionHeading className="mt-section">The details</SectionHeading>

      <dl className="border-line mx-auto mt-10 max-w-3xl border-t">
        {facts.map(({ term, value }) => (
          <div key={term} className="border-line grid gap-2 border-b py-5 md:grid-cols-[10rem_1fr] md:gap-8">
            <dt className="text-caption text-grey pt-0.5 uppercase">{term}</dt>
            <dd className="text-body">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
