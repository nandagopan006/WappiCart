"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";

import { EASE_SETTLE_POINTS } from "@/lib/motion";
import { cx } from "@/lib/cx";
import { buildChatLink } from "@/lib/whatsapp";

/**
 * The mobile dock. Phones only — `md:hidden` on both the dock and its spacer.
 *
 * ── Why it is paper and not charcoal ─────────────────────────────────────
 * The first version was a solid ink bar, and it sat on the page like a
 * separate application. This site is a white gallery: paper ground, ink type,
 * one hairline. So the dock is the page's own material — translucent paper
 * over a hairline — and the *indicator* is the ink.
 *
 * That inversion is not invented for this component. Every button on the site
 * already swaps ink and paper on state, and the size run fills ink when a size
 * is chosen. The dock is the same gesture at navigation scale, which is what
 * makes it read as WappiCart rather than as a component library.
 *
 * ── The capsule hugs its content ─────────────────────────────────────────
 * `w-fit`, centred, with real margin to the screen edge. A full-width bar is a
 * browser chrome convention; a floating capsule is a control. The dock never
 * touches an edge on any side.
 *
 * ── The indicator ────────────────────────────────────────────────────────
 * One element, shared across the three routes by `layoutId`. Motion measures
 * it before and after the route changes and tweens between — so it travels
 * along the dock as a physical object, and the distance is correct at any
 * label width with no hard-coded offsets.
 *
 * Order is not in that group on purpose. It opens WhatsApp, so it is an action
 * and never a location — an indicator that "arrived" there would be lying
 * about where you are. It carries a permanent outlined capsule instead: the
 * same silhouette, drawn rather than filled, so it reads as the dock's one CTA
 * without competing with the filled indicator.
 *
 * ── Motion ───────────────────────────────────────────────────────────────
 * The settle curve, never a spring. The design system allows no overshoot, and
 * navigation that bounces past its target is the first thing that makes an
 * interface feel like a toy. Tap response is a 60ms scale to 0.95 — fast
 * enough to feel like the glass responded, too fast to watch.
 */

/** The settle, as Motion's four control points. */
const SETTLE = [...EASE_SETTLE_POINTS] as [number, number, number, number];

const TRAVEL = { duration: 0.42, ease: SETTLE } as const;
const LABEL = { duration: 0.34, ease: SETTLE } as const;

type Item = {
  label: string;
  href: string;
  /** WhatsApp — an action, not a destination. Never takes the indicator. */
  action?: boolean;
  icon: ReactNode;
};

export function MobileNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  /* The dock eases down and back a little while the page is moving away from
     the reader, and returns the moment they scroll back. It never leaves:
     translating it out of view would make the shopper scroll up to find their
     own navigation, which is the dock fighting the user. */
  const [receding, setReceding] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    if (reduced) return;
    const previous = scrollY.getPrevious() ?? 0;
    /* Past the first screen only — a dock that shifts on the hero's first
       few pixels reads as a glitch. */
    if (y > previous && y > 160) setReceding(true);
    else if (y < previous) setReceding(false);
  });

  const items: Item[] = [
    { label: "Home", href: "/", icon: <HomeIcon /> },
    { label: "Shop", href: "/shop", icon: <ShopIcon /> },
    { label: "About", href: "/about", icon: <AboutIcon /> },
    { label: "Order", href: buildChatLink(), action: true, icon: <ChatIcon /> },
  ];

  /* `/p/[slug]` counts as the shop — a shopper on a product page came from the
     shelf, and the dock should not look like it has lost them. */
  const activeHref =
    pathname === "/"
      ? "/"
      : pathname.startsWith("/shop") || pathname.startsWith("/p/")
        ? "/shop"
        : pathname;

  return (
    <>
      {/* Holds the dock's height at the very bottom of the document, so a
          fixed element can never sit over the last line of the footer. */}
      <div aria-hidden="true" className="h-28 md:hidden" />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <motion.nav
          aria-label="Primary"
          animate={
            reduced ? undefined : { y: receding ? 8 : 0, opacity: receding ? 0.88 : 1 }
          }
          transition={TRAVEL}
          className={cx(
            "pointer-events-auto flex w-fit items-center gap-1 rounded-full p-1.5",
            /* The surface. Near-opaque by default so contrast against a
               photograph is never in question; the blur only deepens it where
               the browser actually supports one, rather than being the thing
               legibility depends on. */
            "bg-paper/95 supports-[backdrop-filter]:bg-paper/72 supports-[backdrop-filter]:backdrop-blur-xl",
            /* A hairline, the same one the whole site is built from, and a
               single very soft ambient shadow. The design system bans drop
               shadows on tiles for good reason — but this element genuinely
               floats over content, and without any separation it reads as a
               strip pasted onto the photograph behind it. Tinted with ink at
               8%, never black at 30%. */
            "border-line border shadow-[0_8px_28px_-12px_rgba(11,11,11,0.18)]",
          )}
        >
          {items.map((item) => {
            const active = !item.action && item.href === activeHref;

            const body = (
              <motion.span
                whileTap={reduced ? undefined : { scale: 0.95 }}
                transition={{ duration: 0.06 }}
                className={cx(
                  "relative flex h-11 items-center gap-2 rounded-full px-4",
                  item.action && "border-line border",
                )}
              >
                {/* The travelling indicator. Inset by a hair so the fill sits
                    inside the dock's padding rather than against its edge. */}
                {active ? (
                  <motion.span
                    layoutId="wc-dock-indicator"
                    transition={reduced ? { duration: 0 } : TRAVEL}
                    aria-hidden="true"
                    /* Not a flat fill. A one-pixel paper highlight along the
                       top edge reads as light catching a raised surface, and a
                       short ink-tinted shadow underneath puts the capsule
                       above the dock rather than printed on it. Both are
                       nearly invisible on their own — together they are the
                       difference between a black rectangle and an object. */
                    className="bg-ink absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_16px_-8px_rgba(11,11,11,0.6)]"
                  />
                ) : null}

                {/* The pop. On becoming active the glyph lifts two pixels and
                    swells past its resting size before settling back to it —
                    the swell is what makes it read as arriving rather than
                    simply being larger. It never overshoots downward and it
                    never returns below 1, so nothing here bounces. */}
                <motion.span
                  animate={
                    reduced
                      ? undefined
                      : active
                        ? { y: -2, scale: [1, 1.18, 1.08] }
                        : { y: 0, scale: 1 }
                  }
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          y: { duration: 0.4, ease: SETTLE },
                          scale: { duration: 0.46, ease: SETTLE, times: [0, 0.42, 1] },
                        }
                  }
                  className={cx(
                    "relative z-10 transition-colors duration-300 ease-(--ease-settle)",
                    active ? "text-paper" : item.action ? "text-ink" : "text-grey",
                  )}
                >
                  {item.icon}
                </motion.span>

                {/* Inactive is icon-only; the label opens on the item you are
                    on. Width and opacity together, so the capsule grows into
                    the word instead of the word appearing inside a capsule
                    that was already the wrong size. */}
                <AnimatePresence initial={false}>
                  {active || item.action ? (
                    <motion.span
                      key="label"
                      initial={reduced ? false : { width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={reduced ? undefined : { width: 0, opacity: 0 }}
                      transition={LABEL}
                      className={cx(
                        "text-caption relative z-10 overflow-hidden pt-px whitespace-nowrap uppercase",
                        /* The glyph beside it has lifted two pixels; without
                           this the label sits visibly low against it. */
                        active ? "text-paper -translate-y-px" : "text-ink",
                      )}
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </motion.span>
            );

            const className = "rounded-full focus-visible:outline-offset-2";

            return item.action ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Order on WhatsApp"
                className={className}
              >
                {body}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {body}
              </Link>
            );
          })}
        </motion.nav>
      </div>
    </>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────────
   Drawn here rather than pulled from a library. Four 18px glyphs at the same
   1.25 stroke as every hairline on the site is not worth a dependency, and an
   icon set would arrive with a house style that is not this one. */

const stroke = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

function HomeIcon() {
  return (
    <svg {...stroke}>
      <path d="M3 8.2 10 3l7 5.2V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.2Z" />
      <path d="M8 17v-5h4v5" />
    </svg>
  );
}

/** A shoe box, not a shopping bag — this shop has no bag. */
function ShopIcon() {
  return (
    <svg {...stroke}>
      <path d="M2.5 7.5h15V16a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7.5Z" />
      <path d="M2.5 7.5 4 3h12l1.5 4.5" />
      <path d="M8 11h4" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg {...stroke}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9.2v4.3" />
      <path d="M10 6.6h.01" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...stroke}>
      <path d="M17 9.6a6.7 6.7 0 0 1-9.9 5.9L3 16.7l1.3-4A6.7 6.7 0 1 1 17 9.6Z" />
    </svg>
  );
}
