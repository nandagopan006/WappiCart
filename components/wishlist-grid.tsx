"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProductGrid } from "@/components/product-grid";
import { RecommendationRail } from "@/components/recommendation-rail";
import { ScrollReveal } from "@/components/scroll-reveal";
import { relatedProducts, type Product } from "@/lib/products";
import { clearWishlist, useWishlist } from "@/lib/wishlist";

/**
 * The saved pairs, resolved against the real catalogue, plus a short row of
 * pairs to keep looking at.
 *
 * ── Why the whole catalogue is passed in ─────────────────────────────────
 * The saved list is slugs. The page above is a Server Component and hands
 * down `products` — already validated, already carrying live prices and
 * stock — and this component picks the saved ones out of it. Nothing about a
 * product is duplicated into storage, so a price change or a sold-out size is
 * correct the moment it ships.
 *
 * A slug that no longer matches anything simply drops out of the map, which
 * is how a discontinued pair disappears instead of rendering broken.
 *
 * ── The order ────────────────────────────────────────────────────────────
 * Saved order, not shelf order: the pair someone saved first sits first. That
 * is the sequence they built, and re-sorting it into the shop's order would
 * throw away the only information this page has that /shop does not.
 *
 * ── Hydration ────────────────────────────────────────────────────────────
 * `useWishlist` returns an empty list on the server, so the first paint is
 * the empty state and the real list arrives on hydration. That is correct
 * rather than unfortunate — the server cannot know what is in this browser's
 * storage, and rendering anything else would be a guess that mismatches.
 */

/** The row never grows past this, however much is left on the shelf. */
const RECOMMENDATION_LIMIT = 8;

export function WishlistGrid({ products }: { products: Product[] }) {
  const saved = useWishlist();
  const [confirming, setConfirming] = useState(false);

  const items = useMemo(() => {
    const bySlug = new Map(products.map((product) => [product.slug, product] as const));
    return saved
      .map((slug) => bySlug.get(slug))
      .filter((product): product is Product => product !== undefined);
  }, [products, saved]);

  /**
   * What to look at next.
   *
   * Two passes, both deterministic — the same wishlist always produces the
   * same row, so nothing reshuffles under the reader between renders.
   *
   *   1. Other pairs from the shelves already being saved from, taken in the
   *      order those pairs were saved. `relatedProducts` is the project's own
   *      same-category helper; this is not a new recommendation system.
   *   2. Topped up from the rest of the catalogue, in shelf order, so the row
   *      still fills when someone has saved a whole category — or nothing at
   *      all, which is what makes this useful on an empty wishlist too.
   *
   * Anything already saved is excluded throughout: recommending a pair back
   * to the person who saved it is the fastest way to look broken.
   */
  const recommendations = useMemo(() => {
    const savedSlugs = new Set(items.map((product) => product.slug));
    const picked: Product[] = [];
    const seen = new Set<string>();

    const take = (product: Product) => {
      if (savedSlugs.has(product.slug) || seen.has(product.slug)) return;
      seen.add(product.slug);
      picked.push(product);
    };

    for (const product of items) {
      for (const related of relatedProducts(product, Number.MAX_SAFE_INTEGER)) {
        if (picked.length >= RECOMMENDATION_LIMIT) break;
        take(related);
      }
      if (picked.length >= RECOMMENDATION_LIMIT) break;
    }

    for (const product of products) {
      if (picked.length >= RECOMMENDATION_LIMIT) break;
      take(product);
    }

    return picked;
  }, [items, products]);

  /* Closing first, then clearing: the dialog animates out against the list it
     was launched from rather than against an empty page. `clearWishlist` is
     guarded on length, so a double press is a no-op. */
  const onConfirmClear = useCallback(() => {
    setConfirming(false);
    clearWishlist();
  }, []);

  return (
    <>
      <ScrollReveal as="header">
        <div className="section-index">
          <h1 className="text-caption text-ink uppercase">Saved pairs</h1>

          <span className="text-caption text-grey ml-auto tabular-nums">
            {items.length > 0
              ? `${String(items.length).padStart(2, "0")} ${items.length === 1 ? "pair" : "pairs"}`
              : "None yet"}
          </span>

          {/* Secondary by weight, not by hiding: a destructive action should
              be findable without being the loudest thing in the header. */}
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="link-quiet text-caption text-grey hover:text-love ml-4 uppercase"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </ScrollReveal>

      {items.length > 0 ? (
        <ProductGrid products={items} className="mt-10" priorityCount={3} />
      ) : (
        <EmptyWishlist />
      )}

      {/* Shown either way. With a wishlist it is what to look at next; without
          one it is the whole point of the page.

          The rail stages its own reveal — header first, then the strip — so it
          is not wrapped in one here. A second wrapper would hide the header
          and the cards together and lose that order. */}
      <RecommendationRail
        products={recommendations}
        heading={items.length > 0 ? "You may also like" : "More to explore"}
        note={
          items.length > 0
            ? "More from the shelves you are saving from."
            : "A place to start. Save a pair and this becomes a shortlist."
        }
      />

      <ConfirmDialog
        open={confirming}
        title="Clear saved pairs"
        message="Remove all saved pairs from your wishlist? This cannot be undone."
        confirmLabel="Clear all"
        onConfirm={onConfirmClear}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** An empty screen is an invitation to act, so it points at the shelf. */
function EmptyWishlist() {
  return (
    <div className="mx-auto max-w-[46ch] py-16 text-center">
      <p className="text-caption text-grey uppercase">No saved pairs</p>
      <p className="text-lead text-ink mt-5">
        Tap the heart on a pair you like. It will be here when you are ready.
      </p>

      <Link
        href="/shop"
        className="text-caption border-ink bg-ink text-paper hover:bg-paper hover:text-ink mt-8 inline-flex h-13 items-center px-10 uppercase transition-colors"
      >
        Explore the collection
      </Link>
    </div>
  );
}
