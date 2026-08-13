import { ProductCard } from "@/components/product-card";
import { cx } from "@/lib/cx";
import type { Product } from "@/lib/products";

/**
 * The grid every page uses. Two columns on a phone, three on a tablet, four
 * on a desktop — the density a shop's own catalogue runs at.
 *
 * The gaps are deliberately tight. A retail grid is scanned, not read, and
 * generous whitespace between tiles slows scanning down without making any
 * single shoe easier to see.
 *
 * `priority` covers the first row only. Everything below the fold loads lazily,
 * which is most of what keeps a twelve-photograph page fast on a phone.
 */
export function ProductGrid({
  products,
  className,
  priorityCount = 4,
}: {
  products: Product[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cx(
        "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.slug} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}
