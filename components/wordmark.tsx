import { cx } from "@/lib/cx";

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

/**
 * The shop name is editable in the admin now, so the split is computed from
 * whatever name it is given rather than from a module-level constant. The
 * default keeps every caller that does not have the name to hand — the brand
 * intro's inner render, a Storybook-less preview — rendering the real lockup
 * instead of an empty span.
 */
export function splitWordmark(name: string) {
  const [, brand, category] = /^([A-Z][a-z]+)([A-Z].*)$/.exec(name) ?? ["", name, ""];
  return { brand, category } as const;
}

export function Wordmark({ name = "WappiCart", className }: { name?: string; className?: string }) {
  const { brand, category } = splitWordmark(name);

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
