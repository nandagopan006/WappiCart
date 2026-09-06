import { cx } from "@/lib/cx";
import { formatPrice } from "@/lib/catalogue";

/**
 * The price, wherever it appears.
 *
 * Ink, never tracked, never coloured. A tracked number is hard to read at a
 * glance and the price is the one thing on a tile that has to be — so it is
 * the only ink-coloured text under a product photograph, and the name above
 * it stays grey.
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
    <span className={cx("text-price text-ink", className)}>
      {formatPrice(price)}
      {mrp ? (
        <>
          {/* Struck-through text reads as a bare second number aloud, so the
              visual is hidden and the meaning is spelled out instead. */}
          <s aria-hidden="true" className="text-grey ml-2 decoration-1">
            {formatPrice(mrp)}
          </s>
          <span className="sr-only">, down from {formatPrice(mrp)}</span>
        </>
      ) : null}
    </span>
  );
}
