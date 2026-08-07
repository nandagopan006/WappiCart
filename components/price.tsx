import { cx } from "@/lib/cx";
import { formatPrice } from "@/lib/products";

/**
 * Numbers are always mono. A price in a serif looks like a magazine;
 * a price in mono looks like stock.
 *
 * There is no accent variant. The price is espresso in the grid and espresso on
 * the product sheet — ember is light, never paint, so it never prices anything.
 * Size, not colour, is what makes the price loud on the sheet.
 */
export function Price({
  price,
  mrp,
  className,
}: {
  price: number;
  mrp?: number;
  className?: string;
}) {
  return (
    <span className={cx("font-mono text-utility", className)}>
      <span className="text-espresso">{formatPrice(price)}</span>
      {mrp ? (
        <>
          {/* Struck-through text reads as a bare second number aloud, so the
              visual is hidden and the meaning is spelled out instead. */}
          <s aria-hidden="true" className="text-muted ml-2 decoration-1">
            {formatPrice(mrp)}
          </s>
          <span className="sr-only">, down from {formatPrice(mrp)}</span>
        </>
      ) : null}
    </span>
  );
}
