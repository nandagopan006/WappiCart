import { ProductCard } from "@/components/product-card";
import { cx } from "@/lib/cx";
import type { Product } from "@/lib/products";

/**
 * The grid every page uses. Two columns on a phone, three from `sm` up.
 *
 * Three rather than four: at four the photographs are small enough that a
 * shoe on a busy background is hard to read at a glance, and this shop's
 * images are lifestyle crops rather than cut-outs on white. Three gives each
 * pair roughly 40% more area for the same page height.
 *
 * `priority` covers the first row only. Everything below the fold loads lazily,
 * which is most of what keeps a twelve-photograph page fast on a phone.
 */
export function ProductGrid({
  products,
  className,
  priorityCount = 3,
}: {
  products: Product[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cx("grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:gap-x-6", className)}
    >
      {products.map((product, i) => (
        <ProductCard key={product.slug} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}
