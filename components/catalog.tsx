"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { ShowroomReveal } from "@/components/showroom-reveal";
import { Wave } from "@/components/wave";
import { SizeRun } from "@/components/size-run";
import { CATEGORIES, type Category, type Product } from "@/lib/products";
import { buildStockEnquiryLink } from "@/lib/whatsapp";
import { cx } from "@/lib/cx";

/**
 * Filtering is instant and client-side. Fifty products needs no server.
 *
 * Category is one-of; sizes are many-of. Picking 9 and 10 means "show me
 * anything I could actually wear", which is how someone with a foot between
 * sizes shops.
 */
export function Catalog({ products, sizesInStock }: { products: Product[]; sizesInStock: number[] }) {
  /* The homepage's category rows arrive as /shop?c=loafers, so the filter is
     already applied when the page opens. Validated against CATEGORIES rather
     than trusted — ?c=anything would otherwise show an empty shelf and read as
     a bug. After first paint this is plain state: changing a filter does not
     touch the URL, because a filter is not a place. */
  const requested = useSearchParams().get("c");
  const initialCategory = CATEGORIES.find((c) => c === requested) ?? null;

  const [category, setCategory] = useState<Category | null>(initialCategory);
  const [sizes, setSizes] = useState<number[]>([]);

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === null || p.category === category) &&
          (sizes.length === 0 || sizes.some((s) => p.sizes.includes(s))),
      ),
    [products, category, sizes],
  );

  return (
    <section>
      {/* Sticks once the page header has scrolled past. */}
      <div className="bg-blush/85 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-page mx-auto px-5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <CategoryLabel active={category === null} onClick={() => setCategory(null)}>
                all
              </CategoryLabel>
              {CATEGORIES.map((c) => (
                <CategoryLabel key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </CategoryLabel>
              ))}
            </div>

            <SizeRun
              multiple
              inStock={sizesInStock}
              selected={sizes}
              onSelect={setSizes}
              label="Filter by size"
              tone="filter"
            />
          </div>
          <Wave />
        </div>
      </div>

      <div className="max-w-page mx-auto px-5 pt-10 md:px-8 md:pt-16">
        {visible.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-10 md:gap-y-20">
            {visible.map((product, i) => (
              <ShowroomReveal key={product.slug} index={i % 3}>
                <ProductCard product={product} priority={i < 4} />
              </ShowroomReveal>
            ))}
          </div>
        ) : (
          <EmptyResult category={category} sizes={sizes} />
        )}
      </div>
    </section>
  );
}

function CategoryLabel({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "text-body relative py-2 lowercase transition-colors",
        active ? "text-espresso" : "text-muted hover:text-espresso",
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cx(
          "filter-underline absolute inset-x-0 bottom-1 h-px origin-left transition-transform duration-200 ease-(--ease-settle)",
          active ? "scale-x-100" : "scale-x-0",
        )}
      />
    </button>
  );
}

/** An empty screen is an invitation to act, so it points at WhatsApp. */
function EmptyResult({ category, sizes }: { category: Category | null; sizes: number[] }) {
  const inSizes =
    sizes.length === 0 ? "" : sizes.length === 1 ? ` in size ${sizes[0]}` : ` in sizes ${sizes.join(" or ")}`;
  const what = category ?? "pairs";

  return (
    <div className="max-w-[42ch] py-8">
      <p className="text-body">
        No {what}
        {inSizes} right now — message us and we&rsquo;ll check the back.
      </p>
      <a
        href={buildStockEnquiryLink({ sizes, category: category ?? undefined })}
        target="_blank"
        rel="noopener noreferrer"
        className="text-body decoration-muted/30 hover:decoration-espresso mt-3 inline-block underline underline-offset-4"
      >
        Message us on WhatsApp
      </a>
    </div>
  );
}
