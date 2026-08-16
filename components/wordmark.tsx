import { cx } from "@/lib/cx";
import { shop } from "@/lib/shop";

/**
 * The shop's mark. One definition, used by the header and by the brand intro.
 *
 * ── Why this is a component and not two spans in the header ──────────────
 * The intro animates the two halves in from opposite sides, so it needs the
 * same split the header uses. Copying the regex and the class names into a
 * second file is how the assembled logo ends up a hair different from the one
 * in the bar — a spacing mistake nobody notices until both are on screen.
 * There is one lockup, and this is it.
 *
 * ── The split ────────────────────────────────────────────────────────────
 * Cut at the name's internal capital: "WappiCart" → "Wappi" + "Cart". WAPPI
 * is the coined half and carries weight 600; CART is the category noun and
 * steps back to 300. A name with no second capital returns whole and renders
 * in a single weight, which is the correct degradation rather than a lockup
 * split in an arbitrary place.
 *
 * The visual rules live in `.wordmark*` in globals.css.
 */

const [, brand, category] = /^([A-Z][a-z]+)([A-Z].*)$/.exec(shop.name) ?? ["", shop.name, ""];

/** The two halves, for anything that needs to address them separately. */
export const WORDMARK_PARTS = { brand, category } as const;

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("wordmark uppercase", className)}>
      <span data-wordmark-brand className="wordmark-brand">
        {brand}
      </span>
      {category ? (
        <span data-wordmark-category className="wordmark-category">
          {category}
        </span>
      ) : null}
    </span>
  );
}
