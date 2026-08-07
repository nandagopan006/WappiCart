import type { Metadata } from "next";
import Image from "next/image";

import { Magnetic } from "@/components/magnetic";
import { Parallax } from "@/components/parallax";
import { Rise } from "@/components/rise";
import { ShowroomReveal } from "@/components/showroom-reveal";
import { SplitText } from "@/components/split-text";
import { Wave } from "@/components/wave";
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
 * The shop, told in five plates rather than three paragraphs.
 *
 * ── What this page is for ────────────────────────────────────────────────
 * It is the page where somebody decides whether to trust a shop that has no
 * cart with their money. So it is editorial in form and factual in content:
 * the delivery areas, the return conditions and the hours we answer in are all
 * still here, set as a numbered index rather than buried in prose. Dropping
 * them would have made the page prettier and the shop less trustworthy, which
 * is the wrong trade on the one page whose whole job is trust.
 *
 * ── The form ─────────────────────────────────────────────────────────────
 * Five numbered plates, each a different shape: a full-height opening
 * statement, then text/image, then a full-bleed dark band, then image/text
 * reversed, then the index. Nothing repeats its predecessor's layout, which is
 * what stops a long page reading as a list of blocks.
 *
 * Every animated part is a component that already existed — SplitText for the
 * headings, ShowroomReveal for the plates, Parallax for the photographs,
 * Magnetic for the two buttons. The page is a Server Component; only those
 * wrappers are client.
 */

/** Photographs are chosen by slug for how they look, with a positional
    fallback so a change in products.json can never leave a hole in the page. */
function plate(slug: string, index: number): Product {
  return getProduct(slug) ?? products[index % products.length];
}

const STORY = plate("brogue-wing-chestnut", 0);
const CRAFT = plate("penny-loafer-tan", 1);
const SHELF = plate("oxford-cap-toe-black", 2);
const CLOSE = plate("kolhapuri-slide-natural", 3);

/** Small mono label. The number is doing real work — these are five plates in
    a fixed order, so the sequence is information rather than decoration. */
function PlateLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="font-mono text-utility text-muted uppercase">
      {index} — {children}
    </p>
  );
}

export default function AboutPage() {
  return (
    <article className="overflow-x-clip">
      {/* ── Opening statement ───────────────────────────────────────────
          Three lines, each a fact, each on its own line so the eye stops at
          every one. No image — the page earns the right to a photograph by
          saying something first. */}
      <section className="max-w-page mx-auto px-5 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28">
        <Rise>
          <p className="font-mono text-utility text-muted uppercase">
            {shop.name} — Kerala
          </p>
        </Rise>

        <div className="@container mt-10 md:mt-14">
          {["Twelve pairs.", "Chosen by two people.", "Sold one message at a time."].map(
            (line, i) => (
              <SplitText
                key={line}
                onScroll
                stagger={0.022}
                className="type-display text-espresso block text-[clamp(2rem,7.6cqw,5.5rem)] leading-[1.02] tracking-[-0.02em]"
                style={{ paddingInlineStart: `${i * 7}%` }}
              >
                {line}
              </SplitText>
            ),
          )}
        </div>

        <Wave className="mt-16 md:mt-20" />
      </section>

      {/* ── 01 · The shop ───────────────────────────────────────────────
          Text left, photograph right, the photograph taller than its column
          so the row is never a tidy rectangle. */}
      <section className="max-w-page mx-auto px-5 md:px-8">
        <ShowroomReveal>
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <PlateLabel index="01">The shop</PlateLabel>
              <SplitText
                as="h2"
                onScroll
                stagger={0.02}
                className="type-heading mt-5 block text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.06]"
              >
                Two people, a room, and a phone.
              </SplitText>
              <Rise index={1}>
                <p className="text-body text-muted mt-6 max-w-[38ch]">
                  We buy small runs from makers we have met. Every pair is photographed in the room
                  it ships from. Nothing here passes through a warehouse.
                </p>
              </Rise>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <Parallax distance={26} className="plate-media relative aspect-4/5 overflow-hidden">
                <div className="card-media absolute inset-0">
                  <Image
                    src={STORY.image}
                    alt={STORY.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 92vw"
                    className="object-cover"
                  />
                </div>
              </Parallax>
            </div>
          </div>
        </ShowroomReveal>
      </section>

      {/* ── 02 · Full-bleed band ────────────────────────────────────────
          The dark passage. One line of type over a photograph, nothing else —
          the page needs somewhere the reader can stop, and a band of espresso
          between two blush sections is where the rhythm changes. */}
      <section className="mt-section relative">
        <div className="relative min-h-[28rem] overflow-hidden md:min-h-[38rem]">
          <Parallax distance={60} className="absolute inset-0">
            <div className="absolute inset-0">
              <Image
                src={CRAFT.images[1] ?? CRAFT.image}
                alt={CRAFT.alt}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </Parallax>

          <div
            aria-hidden="true"
            className="from-espresso/85 via-espresso/50 absolute inset-0 bg-gradient-to-r to-transparent"
          />

          <div className="max-w-page relative mx-auto flex min-h-[28rem] items-center px-5 py-20 md:min-h-[38rem] md:px-8">
            <div className="text-blush max-w-[34ch]">
              <PlateLabel index="02">What we stock</PlateLabel>
              <SplitText
                as="h2"
                onScroll
                stagger={0.02}
                className="type-heading mt-5 block text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.06]"
              >
                A shelf you can hold in your head.
              </SplitText>
              <Rise index={1}>
                <p className="text-body text-blush/75 mt-6">
                  Twelve pairs at a time. If a size is greyed out it is genuinely gone — we would
                  rather show you an empty size than take an order we cannot fill.
                </p>
              </Rise>
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 · How it works ───────────────────────────────────────────
          Reversed: photograph left, text right. The image floats on hover
          rather than sitting in a frame. */}
      <section className="max-w-page mt-section mx-auto px-5 md:px-8">
        <ShowroomReveal>
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:order-1 md:col-span-6">
              {/* Magnetic gives the photograph a slow lean toward the pointer —
                  the "floating" of a showcase object, reusing the wrapper the
                  buttons already use rather than inventing a second one. */}
              <Magnetic strength={10}>
                <Parallax distance={22} className="plate-media relative aspect-square overflow-hidden">
                  <div className="card-media absolute inset-0">
                    <Image
                      src={SHELF.image}
                      alt={SHELF.alt}
                      fill
                      sizes="(min-width: 768px) 50vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                </Parallax>
              </Magnetic>
            </div>

            <div className="md:order-2 md:col-span-5 md:col-start-8">
              <PlateLabel index="03">How it works</PlateLabel>
              <SplitText
                as="h2"
                onScroll
                stagger={0.02}
                className="type-heading mt-5 block text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.06]"
              >
                No cart. No account. One message.
              </SplitText>
              <Rise index={1}>
                <p className="text-body text-muted mt-6 max-w-[38ch]">
                  Pick a pair and a size. The button opens WhatsApp with the shoe, the size and the
                  price already written. We confirm the fit and send payment details in the same
                  chat.
                </p>
              </Rise>
            </div>
          </div>
        </ShowroomReveal>
      </section>

      {/* ── 04 · The index ──────────────────────────────────────────────
          The part of this page somebody actually came for. Set as an index —
          number, term, value, hairline — because a returns policy read as a
          specification is easier to trust than one read as a paragraph. */}
      <section className="max-w-page mt-section mx-auto px-5 md:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <PlateLabel index="04">The details</PlateLabel>
            <SplitText
              as="h2"
              onScroll
              stagger={0.02}
              className="type-heading mt-5 block text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.06]"
            >
              Everything else in writing.
            </SplitText>
          </div>
        </div>

        <Wave className="mt-10" />

        <dl>
          {[
            { term: "Delivery", value: shop.deliveryAreas },
            { term: "Returns", value: `${shop.returnWindow} Message us first and we arrange the pickup.` },
            { term: "We answer", value: shop.replyTime },
            { term: "Photography", value: "Every pair shot by us, in the box it ships in." },
          ].map(({ term, value }, i) => (
            <Rise key={term} index={i} distance={16}>
              <div className="grid gap-2 py-7 md:grid-cols-12 md:gap-8 md:py-9">
                <dt className="font-mono text-utility text-muted uppercase md:col-span-3">{term}</dt>
                <dd className="text-body md:col-span-8 md:col-start-5">{value}</dd>
              </div>
              <Wave />
            </Rise>
          ))}
        </dl>
      </section>

      {/* ── 05 · The close ──────────────────────────────────────────────
          Ends where every page on this site ends: a conversation. The
          photograph carries it so the last thing on the page is a shoe, not a
          form. */}
      <section className="mt-section relative overflow-hidden">
        <div className="relative min-h-[26rem] md:min-h-[32rem]">
          <Parallax distance={50} className="absolute inset-0">
            <div className="absolute inset-0">
              <Image
                src={CLOSE.image}
                alt={CLOSE.alt}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </Parallax>

          <div
            aria-hidden="true"
            className="from-espresso/88 via-espresso/60 absolute inset-0 bg-gradient-to-t to-transparent"
          />

          <div className="max-w-page relative mx-auto flex min-h-[26rem] items-end px-5 py-16 md:min-h-[32rem] md:px-8 md:py-20">
            <div className="text-blush">
              <PlateLabel index="05">Talk to us</PlateLabel>
              <SplitText
                as="h2"
                onScroll
                stagger={0.02}
                className="type-heading mt-5 block text-[clamp(1.75rem,4vw,3rem)] leading-[1.04]"
              >
                Ask us anything before you buy.
              </SplitText>

              <Rise index={1} className="mt-9">
                <Magnetic>
                  <a
                    href={buildChatLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blush text-espresso text-body group inline-flex h-14 items-center gap-3 rounded-full px-9 font-medium focus-visible:outline-offset-4"
                  >
                    <span data-magnetic-label className="inline-flex items-center gap-3">
                      <WhatsappGlyph className="text-whatsapp" />
                      Message the shop
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </a>
                </Magnetic>
              </Rise>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
