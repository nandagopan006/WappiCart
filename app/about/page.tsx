import type { Metadata } from "next";
import Image from "next/image";

import { SectionHeading } from "@/components/section-heading";
import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { getProduct, products, type Product } from "@/lib/products";
import { shop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "About",
  description: `Who runs ${shop.name}, where it ships, and how returns work.`,
  alternates: { canonical: "/about" },
};

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
function plate(slug: string, index: number): Product {
  return getProduct(slug) ?? products[index % products.length];
}

const PORTRAIT = plate("brogue-wing-chestnut", 0);

const FACTS = [
  { term: "Delivery", value: shop.deliveryAreas },
  { term: "Returns", value: `${shop.returnWindow} Message us first and we arrange the pickup.` },
  { term: "We answer", value: shop.replyTime },
  { term: "Photography", value: "Every pair shot by us, in the box it ships in." },
];

export default function AboutPage() {
  return (
    <div className="max-w-page mx-auto px-4 pt-10 pb-section md:px-8 md:pt-14">
      <SectionHeading as="h1">About the shop</SectionHeading>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="bg-mist relative aspect-4/3 overflow-hidden">
          <Image
            src={PORTRAIT.image}
            alt={PORTRAIT.alt}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="max-w-[46ch]">
          <p className="text-title text-ink font-medium">
            Two people, a room, and a phone.
          </p>
          <p className="text-body text-grey mt-5">
            We buy small runs from makers we have met. Every pair is photographed in the room it
            ships from. Nothing here passes through a warehouse.
          </p>
          <p className="text-body text-grey mt-4">
            Twelve pairs at a time. If a size is greyed out it is genuinely gone — we would rather
            show you an empty size than take an order we cannot fill.
          </p>
          <p className="text-body text-grey mt-4">
            Pick a pair and a size. The button opens WhatsApp with the shoe, the size and the price
            already written. We confirm the fit and send payment details in the same chat.
          </p>

          <a
            href={buildChatLink()}
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
        {FACTS.map(({ term, value }) => (
          <div key={term} className="border-line grid gap-2 border-b py-5 md:grid-cols-[10rem_1fr] md:gap-8">
            <dt className="text-caption text-grey pt-0.5 uppercase">{term}</dt>
            <dd className="text-body">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
