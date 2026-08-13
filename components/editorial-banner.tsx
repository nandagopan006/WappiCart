"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Magnetic } from "@/components/magnetic";
import { ProximityField } from "@/components/proximity-field";
import { Rise } from "@/components/rise";
import { ShowroomReveal } from "@/components/showroom-reveal";
import { SplitText } from "@/components/split-text";
import { canAnimateRich } from "@/lib/motion";
import type { Product } from "@/lib/products";

/**
 * The manifesto plate: the shop's whole model in four words, set enormous over
 * one photograph.
 *
 * ── What was wrong before ────────────────────────────────────────────────
 * This section was a heading and a four-line paragraph parked in the left
 * third of a photograph — the copy explained the model instead of declaring
 * it, the type was a size class below every other big moment on the site, and
 * the image was a backdrop rather than a participant. It read as an
 * e-commerce banner wearing a nice photo.
 *
 * ── The composition ──────────────────────────────────────────────────────
 * Centre-stage type over a full-bleed image:
 *
 *   ONE MESSAGE.   solid blush — the instruction
 *   ONE PAIR.      blush outline — the object, drawn rather than filled
 *
 * One sentence, two weights. The solid line is what you do; the outlined line
 * is what you get, present but transparent, like the pair not yet chosen. The
 * paragraph is gone — everything it said is now one caption line under the
 * headline, and the details live one message away anyway, which is the whole
 * point of the shop.
 *
 * ── Motion ───────────────────────────────────────────────────────────────
 * The plate arrives through ShowroomReveal's curtain like the products do.
 * Inside it, the image breathes at two speeds: a slow scroll-zoom scrubbed
 * across the section's whole traversal, and a small cursor drift on top. The
 * two write different transform channels of the same element (scale vs x/y),
 * so they compose instead of fighting. The headline letters answer the cursor
 * through ProximityField — the same physics as the hero, light enough here to
 * feel like the type noticing you rather than performing.
 */
export function EditorialBanner({ product }: { product: Product }) {
  const rootRef = useRef<HTMLElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const zoom = zoomRef.current;
    if (!root || !zoom || !canAnimateRich()) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      /* The slow push-in. Scrubbed against the section's full pass through the
         viewport, so the photograph is always moving while it is on screen —
         at a rate nobody could point to. Scale only: translation on this
         element belongs to the cursor drift below. */
      gsap.fromTo(
        zoom,
        { scale: 1.03 },
        {
          scale: 1.14,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: 0.6 },
        },
      );

      /* Cursor drift — a few pixels, opposite the pointer, so the photograph
         feels suspended rather than pinned. quickTo, never a tween per event. */
      const driftX = gsap.quickTo(zoom, "x", { duration: 1.4, ease: "power3.out" });
      const driftY = gsap.quickTo(zoom, "y", { duration: 1.4, ease: "power3.out" });

      const onMove = (event: PointerEvent) => {
        const box = root.getBoundingClientRect();
        const relX = gsap.utils.clamp(-1, 1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2));
        const relY = gsap.utils.clamp(-1, 1, (event.clientY - (box.top + box.height / 2)) / (box.height / 2));
        driftX(relX * -10);
        driftY(relY * -6);
      };

      const onLeave = () => {
        driftX(0);
        driftY(0);
      };

      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);

      return () => {
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
      };
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    /* No top margin: this sits directly under the dark category band, and a
       strip of blush between two full-bleed sections reads as a gap rather
       than as breathing room. */
    <section ref={rootRef} className="relative">
      <ShowroomReveal>
        <div className="relative min-h-[32rem] overflow-hidden md:min-h-[44rem]">
          {/* The photograph, oversized so neither the zoom nor the drift can
              ever expose an edge. */}
          <div ref={zoomRef} className="absolute -inset-[4%] will-change-transform">
            <Image
              src={product.images[1] ?? product.image}
              alt={product.alt}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>

          {/* Ground for the type: an even dimming so the blush headline reads
              across the whole frame, a deeper pool at the base for the caption
              and button, and the warmth every dark passage on this site
              carries. Light, never paint. */}
          <div aria-hidden="true" className="bg-espresso/35 absolute inset-0" />
          <div aria-hidden="true" className="hero-scrim absolute inset-x-0 bottom-0 h-[55%]" />
          <div aria-hidden="true" className="ember-glow -top-[40%] -left-[12%]" />

          <div className="max-w-page relative mx-auto flex min-h-[32rem] flex-col items-center justify-center px-5 py-20 text-center md:min-h-[44rem] md:px-8">
            <Rise>
              <p className="font-mono text-utility text-blush/70 uppercase">No cart. No noise.</p>
            </Rise>

            {/* The manifesto. Letters answer the cursor — lightly. At this size
                the full hero treatment would be a carnival; this is the type
                noticing you. */}
            <ProximityField radius={300} lift={-12} swell={0.05} className="@container mt-8 w-full">
              <SplitText
                onScroll
                stagger={0.03}
                className="type-display text-blush block leading-[0.95] text-[clamp(2.6rem,10cqw,7.5rem)] tracking-[-0.02em]"
              >
                One message.
              </SplitText>
              <SplitText
                onScroll
                delay={0.18}
                stagger={0.03}
                className="type-outline type-outline-blush block leading-[0.95] text-[clamp(2.6rem,10cqw,7.5rem)] tracking-[-0.02em]"
              >
                One pair.
              </SplitText>
            </ProximityField>

            <Rise index={1} className="mt-9">
              <p className="text-body text-blush/80">
                Size and price already written. A reply within the hour.
              </p>
            </Rise>

            <Rise index={2} className="mt-10">
              <Magnetic>
                <Link
                  href="/shop"
                  className="border-blush bg-blush text-espresso text-body hover:text-blush group inline-flex h-14 items-center gap-3 rounded-full border px-10 font-medium transition-colors duration-300 ease-(--ease-settle) hover:bg-transparent focus-visible:outline-offset-4"
                >
                  <span data-magnetic-label className="inline-flex items-center gap-3">
                    Browse the pairs
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1.5"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </Magnetic>
            </Rise>
          </div>
        </div>
      </ShowroomReveal>
    </section>
  );
}
