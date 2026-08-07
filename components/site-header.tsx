"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { WhatsappGlyph } from "@/components/whatsapp-glyph";
import { DURATION, EASE_SETTLE, prefersReducedMotion } from "@/lib/motion";
import { CATEGORIES } from "@/lib/products";
import { shop } from "@/lib/shop";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * Categories left, wordmark centred, the one way to buy on the right.
 *
 * There is no search, no login, no wishlist and no cart icon, because this
 * shop has none of those things. Putting them here would be decoration
 * pretending to be function — the whole site is built so the only control that
 * matters is the WhatsApp link.
 *
 * ── Motion ───────────────────────────────────────────────────────────────
 * On load the links rise in sequence, left to right, so the bar assembles
 * rather than appearing. On scroll the bar tightens: padding closes, the
 * wordmark steps down a size, and the blur and border strengthen. That is
 * driven by a single ScrollTrigger writing to CSS custom properties, so the
 * browser interpolates two numbers instead of React re-rendering a sticky
 * element on every scroll event.
 *
 * The nav is `position: sticky`, which ScrollTrigger handles natively — no
 * pinning, no scroll-jacking, nothing taken away from the visitor.
 */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-nav-item]",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: DURATION.settle, ease: EASE_SETTLE, stagger: 0.05, delay: 0.1 },
      );

      /* Two numbers, interpolated by the compositor. `--header-pad` drives the
         vertical padding and `--header-solid` the blur/border/shadow strength,
         both read by the CSS below. */
      gsap.fromTo(
        node,
        { "--header-pad": "1rem", "--header-solid": 0 },
        {
          "--header-pad": "0.55rem",
          "--header-solid": 1,
          ease: "none",
          scrollTrigger: { start: "top top", end: "+=180", scrub: 0.4 },
        },
      );
    }, node);

    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={ref}
      className="site-header border-muted/20 sticky top-0 z-40 border-b backdrop-blur-md"
    >
      <div className="max-w-page mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 md:px-8">
        <nav className="font-mono text-utility hidden items-center gap-6 uppercase md:flex">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              data-nav-item
              data-anim
              href={`/shop?c=${category}`}
              className="link-underline text-muted hover:text-espresso transition-colors"
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* Mobile keeps one link rather than four — the shelf list lives one
            tap away on /shop, where it can breathe. */}
        <Link
          data-nav-item
          data-anim
          href="/shop"
          className="link-underline font-mono text-utility text-muted hover:text-espresso uppercase transition-colors md:hidden"
        >
          Shop
        </Link>

        <Link
          data-nav-item
          data-anim
          href="/"
          className="type-heading site-wordmark col-start-2 text-center tracking-[0.18em] uppercase"
        >
          {shop.name}
        </Link>

        <div className="font-mono text-utility col-start-3 flex items-center justify-end gap-5 uppercase">
          <Link
            data-nav-item
            data-anim
            href="/about"
            className="link-underline text-muted hover:text-espresso hidden transition-colors sm:block"
          >
            About
          </Link>
          <a
            data-nav-item
            data-anim
            href={buildChatLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline hover:text-muted flex items-center gap-2 transition-colors"
          >
            <WhatsappGlyph className="text-whatsapp" />
            <span className="hidden sm:inline">Order</span>
          </a>
        </div>
      </div>
    </header>
  );
}
