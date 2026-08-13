"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Magnetic } from "@/components/magnetic";
import { SplitText } from "@/components/split-text";
import { canAnimateRich, DURATION, EASE_DRIFT, EASE_SETTLE, prefersReducedMotion } from "@/lib/motion";
import { formatPrice, type Product } from "@/lib/products";

/**
 * A full-screen campaign plate: one photograph, one word, one price, one way in.
 *
 * ── The material problem this is designed around ─────────────────────────
 * The shop's photographs are not cut-outs. They are rectangles with their own
 * backgrounds — studio grey, floorboards, sand. A shoe floating in a spotlight
 * and breaking the edge of the screen needs a transparent PNG; with these
 * assets it would be a very large picture of somebody's floor.
 *
 * So the photograph is the stage rather than an object standing on one. It
 * bleeds off three edges, and the fourth is dissolved with a gradient mask
 * instead of being cut. Nothing terminates on a straight line, which is what
 * stops it reading as a picture pasted onto a page — and the dissolve does the
 * job the spotlight was meant to do, because a photograph fading into darkness
 * *is* lighting.
 *
 * ── The composition ──────────────────────────────────────────────────────
 *   z-0   the spotlight, a pool of warmth behind everything
 *   z-10  the product's name set enormous, bleeding off both sides at 7%
 *   z-20  the photograph, dissolving into the stage on its left
 *   z-30  four pieces of information and nothing else
 *
 * The stage is espresso. Everything below it is blush, so a dark first screen
 * makes the hero read as a separate act — and it is the only way this palette
 * yields cinematic light, because a cream page cannot be lit.
 *
 * ── What was removed ─────────────────────────────────────────────────────
 * The stock counters, the "new this week" label, the explanatory paragraph and
 * the second link. A campaign says one thing. What that costs — the "no cart,
 * no account" line — is now the tagline, so the proposition is still the first
 * thing read, in six words rather than twenty.
 */

/* The word sits at 28% as a block; each letter then rides between a quarter of
   that and the full value as the cursor nears it. Splitting the fade across
   two multipliers is what lets the letters brighten fourfold and still bottom
   out at a whisper — opacity alone cannot go above 1. */
const BASE_GLYPH_OPACITY = 0.25;

export function Hero({ featured }: { featured: Product }) {
  const rootRef = useRef<HTMLElement>(null);
  const shoeRef = useRef<HTMLDivElement>(null);

  /* One word, set enormous. The product's own name rather than the brand's —
     the brand is already in the header, and a name over its own photograph
     labels the image instead of repeating the masthead. */
  const headline = featured.name.split(" ")[0].toUpperCase();

  useLayoutEffect(() => {
    const root = rootRef.current;
    const shoe = shoeRef.current;
    if (!root || !shoe) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduced = prefersReducedMotion();
    const rich = canAnimateRich();

    const ctx = gsap.context(() => {
      /* Disarm the CSS failsafes. A CSS animation outranks inline styles for
         the properties it animates, so one still armed at 3s would pin
         `transform: none` on the photograph and stop the float dead. */
      gsap.set(["[data-hero-info]", "[data-hero-light]", shoe], { animation: "none" });

      if (!reduced) {
        const intro = gsap.timeline({ defaults: { ease: EASE_SETTLE } });

        intro
          /* The light comes up first and finishes last, so everything else
             arrives into a room that is already lit. */
          .fromTo(
            "[data-hero-light]",
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 2.6, ease: "power2.out" },
            0,
          )
          /* Slightly oversized and soft, resolving to full and sharp — a lens
             finding focus rather than a div fading in. */
          .fromTo(
            shoe,
            { opacity: 0, scale: 1.08, filter: "blur(22px)" },
            {
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              duration: 1.8,
              /* Drop the filter once it is at zero so the float loop below
                 never pays for a blur repaint on a full-screen image. */
              onComplete: () => gsap.set(shoe, { clearProps: "filter" }),
            },
            0.15,
          )
          .fromTo(
            "[data-hero-info]",
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: DURATION.settle, stagger: 0.1 },
            1.1,
          );
      }

      if (!rich) return;

      /* Eighteen pixels over eight seconds on an image this size is felt
         rather than seen — the only version of a floating loop that does not
         become annoying by the second minute. */
      gsap.to(shoe, {
        y: -18,
        scale: 1.015,
        duration: 8,
        ease: EASE_DRIFT,
        repeat: -1,
        yoyo: true,
      });

      /* quickTo, not a tween per mousemove. A high-polling mouse fires far
         above 60Hz, and a fresh tween per event is how this kind of effect
         quietly costs more frames than the rest of the page together.

         The word drifts against the photograph so the planes separate. */
      const shoeX = gsap.quickTo(shoe, "x", { duration: 1.2, ease: "power3.out" });
      const shoeTilt = gsap.quickTo(shoe, "rotationY", { duration: 1.2, ease: "power3.out" });
      const wordX = gsap.quickTo("[data-hero-word]", "x", { duration: 1.6, ease: "power3.out" });

      /* ── Letters that answer the cursor ───────────────────────────────
         Every glyph lifts, swells and — where it has headroom — brightens by
         how close the pointer is to it, falling off to nothing past its
         group's radius. The falloff is per-letter and squared, so moving
         across a word sends a wave through it rather than switching a block
         on.

         Two groups, tuned differently. The ghost word is enormous and faint,
         so it gets a wide radius, a long lift and a fourfold brightening. The
         product name is small, already at full opacity and actually being
         read, so it gets a tight radius and a short lift — the same gesture at
         the scale of the type it is applied to.

         Three things keep this cheap at pointer frequency:
           · one quickTo per property per glyph, created once — never a tween
             per event
           · rectangles are measured once and cached. Reading
             getBoundingClientRect for every letter on every pointermove is a
             forced layout at pointer frequency, which is exactly how an effect
             like this ends up costing more than everything else on the page
           · the cache is rebuilt on resize and on scroll, the only two things
             that move them */
      type Proximity = {
        selector: string;
        radius: number;
        lift: number;
        swell: number;
        /** Resting opacity. 1 means the group is already fully visible and
            only moves. */
        base: number;
      };

      const GROUPS: Proximity[] = [
        { selector: "[data-hero-word] [data-glyph]", radius: 420, lift: -34, swell: 0.12, base: BASE_GLYPH_OPACITY },
        { selector: "[data-hero-name] [data-glyph]", radius: 150, lift: -9, swell: 0.07, base: 1 },
      ];

      const groups = GROUPS.map((config) => {
        const glyphs = gsap.utils.toArray<HTMLElement>(config.selector);
        return {
          config,
          glyphs,
          centres: [] as { x: number; y: number }[],
          controls: glyphs.map((glyph) => ({
            y: gsap.quickTo(glyph, "y", { duration: 0.9, ease: "power3.out" }),
            scale: gsap.quickTo(glyph, "scale", { duration: 0.9, ease: "power3.out" }),
            opacity: gsap.quickTo(glyph, "opacity", { duration: 0.9, ease: "power3.out" }),
          })),
        };
      });

      const measure = () => {
        groups.forEach((group) => {
          group.centres = group.glyphs.map((glyph) => {
            const r = glyph.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          });
        });
      };

      /* The reveal is a CSS transition on transform. GSAP writing transform
         every frame while that transition is still armed would double-ease and
         lag, so the letters are handed over only once the reveal has landed.

         Measuring happens here, not at setup. During the reveal every glyph is
         translated a full 115% below where it ends up, so centres cached
         earlier are wrong by more than a letter height — the falloff then
         computes zero for every pointer position and the whole effect silently
         does nothing. */
      const takeover = gsap.delayedCall(reduced ? 0 : 1.7, () => {
        groups.forEach((group) => {
          gsap.set(group.glyphs, { transition: "none", opacity: group.config.base });
        });
        measure();
      });

      const onMove = (event: PointerEvent) => {
        const box = root.getBoundingClientRect();
        const relX = gsap.utils.clamp(-1, 1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2));

        shoeX(relX * -18);
        shoeTilt(relX * 3);
        wordX(relX * 26);

        groups.forEach(({ config, centres, controls }) => {
          controls.forEach((control, i) => {
            const centre = centres[i];
            if (!centre) return;

            const distance = Math.hypot(event.clientX - centre.x, event.clientY - centre.y);
            /* Squared falloff: the response stays close to the pointer instead
               of smearing evenly across the whole word. */
            const near = gsap.utils.clamp(0, 1, 1 - distance / config.radius) ** 2;

            control.y(near * config.lift);
            control.scale(1 + near * config.swell);
            control.opacity(config.base + near * (1 - config.base));
          });
        });
      };

      const onLeave = () => {
        shoeX(0);
        shoeTilt(0);
        wordX(0);
        groups.forEach(({ config, controls }) => {
          controls.forEach((control) => {
            control.y(0);
            control.scale(1);
            control.opacity(config.base);
          });
        });
      };

      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, { passive: true });

      /* Two rates on the way out: the word leaves fastest, the photograph
         barely at all. That is what makes the screen feel like it has depth
         rather than one sheet sliding away. */
      gsap.to("[data-hero-word]", {
        yPercent: -26,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.6 },
      });

      gsap.to(shoe, {
        yPercent: 8,
        scale: 1.08,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.6 },
      });

      return () => {
        takeover.kill();
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure);
      };
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      /* Full screen less the header, so the plate ends where the fold does
         rather than a hair past it. */
      className="bg-espresso text-blush relative flex min-h-[calc(100svh-4.5rem)] items-end overflow-hidden"
      style={{ perspective: "1400px" }}
    >
      {/* The spotlight. A pool of warmth behind the whole plate — the one thing
          that stops a dark stage reading as a flat black rectangle. */}
      <div
        data-hero-light
        data-anim
        aria-hidden="true"
        className="hero-spotlight pointer-events-none absolute top-1/2 left-[58%] z-0 -translate-x-1/2 -translate-y-1/2"
      />

      {/* The name, enormous, bleeding off both sides and sitting behind the
          photograph at 7% — read as texture first and as a label second. */}
      <div
        data-hero-word
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 select-none"
      >
        <SplitText
          delay={0.35}
          stagger={0.05}
          className="type-display text-blush/[0.28] block text-center leading-none whitespace-nowrap text-[clamp(6rem,27vw,24rem)]"
        >
          {headline}
        </SplitText>
      </div>

      {/* The photograph. It bleeds off the top, bottom and right; its left edge
          is dissolved rather than cut, which is what makes it read as light
          falling away instead of a picture pasted onto a page. */}
      <div
        ref={shoeRef}
        data-anim
        className="hero-bleed absolute inset-y-0 right-0 z-20 w-full md:w-[74%] lg:w-[64%]"
      >
        <Image
          src={featured.image}
          alt={featured.alt}
          fill
          priority
          sizes="(min-width: 1024px) 64vw, (min-width: 768px) 74vw, 100vw"
          className="object-cover"
        />
      </div>

      {/* A scrim under the information, above the photograph.
          On a wide screen the copy lands in the dissolved half and needs
          nothing. On a phone the photograph is full-width, so "Runner Low" was
          sitting on a white sneaker — blush on white, unreadable. The
          photographs vary too much to rely on any of them being dark where the
          text happens to fall, so the contrast is guaranteed here rather than
          hoped for. Weaker from md up, where it is only refining an edge the
          dissolve already made. */}
      <div
        aria-hidden="true"
        className="hero-scrim pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[58%] md:h-[42%]"
      />

      {/* Four things and nothing else. */}
      <div className="max-w-page relative z-30 mx-auto w-full px-5 pt-28 pb-14 md:px-8 md:pb-20">
        <div className="max-w-[24rem]">
          <p data-hero-info data-anim className="font-mono text-utility text-blush/60 uppercase">
            Shoes that arrive in a chat
          </p>

          {/* Through SplitText so the letters exist as individual spans for
              the cursor to answer. It renders the whole name once for screen
              readers and marks the split copy aria-hidden, so nothing is read
              letter by letter. */}
          <div data-hero-info data-anim data-hero-name className="mt-5">
            <SplitText
              as="h1"
              delay={1.25}
              stagger={0.03}
              className="type-heading block text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.02]"
            >
              {featured.name}
            </SplitText>
          </div>

          <p data-hero-info data-anim className="font-mono text-utility text-blush/80 mt-4">
            {formatPrice(featured.price)}
          </p>

          <span data-hero-info data-anim className="mt-9 inline-block">
            <Magnetic>
              <Link
                href="/shop"
                className="bg-blush text-espresso text-body group inline-flex h-14 items-center gap-3 rounded-full px-9 font-medium focus-visible:outline-offset-4"
              >
                <span data-magnetic-label className="inline-flex items-center gap-3">
                  Discover the collection
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 ease-(--ease-settle) group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </Link>
            </Magnetic>
          </span>
        </div>
      </div>
    </section>
  );
}
