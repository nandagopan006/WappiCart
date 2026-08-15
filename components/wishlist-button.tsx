"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EASE_SETTLE_POINTS } from "@/lib/motion";
import { cx } from "@/lib/cx";
import { toggleWishlist, useIsWishlisted } from "@/lib/wishlist";

/**
 * The heart on a product tile.
 *
 * ── What changed, and why ────────────────────────────────────────────────
 * The control used to be a bare outline heart with no surface under it. On a
 * pair photographed against charcoal, a thin dark stroke is invisible — the
 * button was present, correct and completely undiscoverable. It now sits on a
 * small translucent paper chip, which is what attaches it to the photograph
 * instead of floating over it.
 *
 * ── It is a sibling of the card link, never a child ──────────────────────
 * A `<button>` inside an `<a>` is invalid HTML and behaves inconsistently
 * with a keyboard. `ProductCard` places this next to its `<Link>` rather than
 * inside it. `stopPropagation` is still called because the two overlap
 * visually and a stray bubble would read as the shopper asking for the
 * product page.
 *
 * ── The state is read from the store, not held here ──────────────────────
 * `useIsWishlisted` subscribes to a boolean, so this re-renders only when its
 * own pair is toggled — and two cards for the same pair, or a card and the
 * wishlist page, can never disagree. A filtered or re-sorted grid always
 * shows the right hearts because nothing is keyed to position.
 *
 * The wishlist logic itself is untouched: this component still calls
 * `toggleWishlist` and reads `useIsWishlisted`, exactly as before.
 *
 * ── Saving is celebrated, removing is not ────────────────────────────────
 * Adding plays a press-and-swell, a warm glow and a short burst. Removing
 * plays a small shrink and lets the fill drain away — no burst, no glow.
 * Undoing something should never feel like an achievement.
 */

const SETTLE = [...EASE_SETTLE_POINTS] as [number, number, number, number];

/**
 * The burst, computed once at module scope.
 *
 * Every value is derived from the particle's index rather than `Math.random`.
 * That keeps it deterministic — identical on the server and the client, no
 * hydration risk — while still looking scattered, because the offsets are
 * irregular by construction. It also means this array is built once for the
 * whole app rather than per card, per click.
 *
 * Eight particles on a compact radius: enough to read as a burst, small
 * enough that it never covers the shoe.
 */
const BURST = Array.from({ length: 8 }, (_, i) => {
  /* An even ring, nudged off-axis alternately so it is not a clock face. */
  const angle = (i / 8) * Math.PI * 2 + (i % 2 === 0 ? -0.16 : 0.24);
  const distance = 21 + (i % 3) * 6;

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    scale: 0.46 + (i % 4) * 0.13,
    rotate: i % 2 === 0 ? -24 : 28,
    delay: (i % 3) * 0.022,
    kind: i % 4,
  };
});

export function WishlistButton({
  slug,
  name,
  className,
}: {
  slug: string;
  /** Named in the accessible label, so a screen reader hears which pair. */
  name: string;
  className?: string;
}) {
  const saved = useIsWishlisted(slug);
  const reduced = useReducedMotion();

  /* Non-null only while a celebration is playing. Incrementing the number
     re-keys the burst, so a rapid double-save replays it instead of the
     second one being swallowed by the first. */
  const [burst, setBurst] = useState<number | null>(null);

  /* Particles are temporary. This unmounts them once the longest one has
     finished, so a grid the shopper has been saving from does not accumulate
     eighty dead spans. The timer is cleared on unmount and on re-fire. */
  useEffect(() => {
    if (burst === null) return;
    const id = window.setTimeout(() => setBurst(null), 700);
    return () => window.clearTimeout(id);
  }, [burst]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      /* The card link sits underneath. Neither the navigation nor the
         browser's default should run. */
      event.preventDefault();
      event.stopPropagation();

      if (!saved && !reduced) setBurst((count) => (count ?? 0) + 1);
      toggleWishlist(slug);
    },
    [saved, slug, reduced],
  );

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      /* The icon alone does not say what will happen, and "heart" says
         nothing at all. The label names the action and the pair. */
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      whileHover={reduced ? undefined : { scale: 1.08 }}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      transition={{ duration: 0.18, ease: SETTLE }}
      className={cx(
        /* 36px chip inside a 44px hit area — a comfortable thumb target that
           does not put a large disc on the photograph. */
        "relative flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-offset-0",
        className,
      )}
    >
      {/* ── The chip ───────────────────────────────────────────────────────
          Translucent paper over a hairline, so the photograph stays visible
          through it and the control still reads on a dark or busy crop. It
          firms up when the card is hovered — present at rest, deliberate
          under the hand. `group` is on the card wrapper. */}
      <span
        aria-hidden="true"
        className={cx(
          "absolute inset-[3px] rounded-full border transition-[background-color,border-color,box-shadow] duration-300 ease-(--ease-settle)",
          "supports-[backdrop-filter]:backdrop-blur-sm",
          saved
            ? "border-love/25 bg-paper/90"
            : "border-line/70 bg-paper/70 group-hover:border-line group-hover:bg-paper/90",
          "shadow-[0_1px_4px_-2px_rgba(11,11,11,0.18)] group-hover:shadow-[0_3px_10px_-4px_rgba(11,11,11,0.24)]",
        )}
      />

      {/* ── The glow ───────────────────────────────────────────────────────
          One warm pulse at the moment of saving, then gone. Never a resting
          state — a permanent glow is a notification, not a confirmation. */}
      <AnimatePresence>
        {burst !== null ? (
          <motion.span
            key={`glow-${burst}`}
            aria-hidden="true"
            initial={{ scale: 0.55, opacity: 0.5 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.5, ease: SETTLE }}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-love) 60%, transparent), transparent 70%)",
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* ── The burst ──────────────────────────────────────────────────────
          Compact on purpose: a 21–33px radius keeps it around the control
          rather than across the shoe. Transform and opacity only, so the
          whole thing stays on the compositor. */}
      <AnimatePresence>
        {burst !== null
          ? BURST.map((particle, i) => (
              <motion.span
                key={`p-${burst}-${i}`}
                aria-hidden="true"
                initial={{ x: 0, y: 0, scale: 0.8, opacity: 0.95, rotate: 0 }}
                animate={{
                  x: particle.x,
                  y: particle.y,
                  scale: particle.scale,
                  opacity: 0,
                  rotate: particle.rotate,
                }}
                transition={{ duration: 0.55, delay: particle.delay, ease: SETTLE }}
                className="text-love pointer-events-none absolute"
              >
                <Particle kind={particle.kind} />
              </motion.span>
            ))
          : null}
      </AnimatePresence>

      {/* ── The heart ──────────────────────────────────────────────────────
          Compress, swell past resting size, settle — about 420ms. `initial=
          {false}` keeps it from firing on mount, so a page of already-saved
          pairs does not pulse on arrival. Removing gets a small shrink and
          nothing else. */}
      <motion.span
        initial={false}
        animate={
          reduced
            ? { scale: 1 }
            : saved
              ? { scale: [1, 0.9, 1.2, 1] }
              : { scale: [1, 0.94, 1] }
        }
        transition={
          reduced
            ? { duration: 0 }
            : saved
              ? { duration: 0.42, times: [0, 0.2, 0.6, 1], ease: SETTLE }
              : { duration: 0.24, ease: SETTLE }
        }
        className="relative"
      >
        <HeartIcon saved={saved} />
      </motion.span>
    </motion.button>
  );
}

/**
 * Outline at rest, filled deep red when saved. The stroke stays on the filled
 * state so the silhouette keeps its size and only its weight changes — a
 * shape that grows on fill makes the whole chip look like it moved.
 */
function HeartIcon({ saved }: { saved: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={cx(
        "transition-[fill,stroke] duration-300 ease-(--ease-settle)",
        saved ? "fill-love stroke-love" : "fill-transparent stroke-ink/75",
      )}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 16.4 3.9 10.3a3.6 3.6 0 0 1 5.1-5.1l1 1 1-1a3.6 3.6 0 1 1 5.1 5.1Z" />
    </svg>
  );
}

/**
 * Four shapes in the burst — filled heart, outline heart, dot, spark. The mix
 * is what stops it reading as a row of identical stamps; drawn at 7–9px so
 * they register as sparks rather than as icons.
 */
function Particle({ kind }: { kind: number }) {
  if (kind === 2) {
    return (
      <svg width="5" height="5" viewBox="0 0 6 6" aria-hidden="true">
        <circle cx="3" cy="3" r="3" fill="currentColor" />
      </svg>
    );
  }

  if (kind === 3) {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        {/* A four-point spark: two crossed tapers, not a star glyph. */}
        <path d="M5 0c.3 2.6.9 4.1 5 5-4.1.9-4.7 2.4-5 5-.3-2.6-.9-4.1-5-5 4.1-.9 4.7-2.4 5-5Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill={kind === 0 ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={kind === 0 ? 0 : 2.4}
      strokeLinejoin="round"
    >
      <path d="M10 16.4 3.9 10.3a3.6 3.6 0 0 1 5.1-5.1l1 1 1-1a3.6 3.6 0 1 1 5.1 5.1Z" />
    </svg>
  );
}
