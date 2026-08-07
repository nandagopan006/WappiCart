"use client";

import { SIZE_RUN } from "@/lib/products";
import { cx } from "@/lib/cx";

/**
 * The shop's full size run, always rendered whole.
 *
 * Sizes that are sold out sit at 30% opacity and cannot be tapped. Hiding them
 * would be easier and would also be a small lie — honesty is a luxury signal.
 *
 * Two modes, because the two places this appears mean different things:
 *   single — the product sheet. Picking 10 replaces 9; you order one size.
 *   multi  — the shop filter. Picking 10 adds to 9; you are narrowing a list.
 *
 * `tone="filter"` is ember's "active filter state" use and belongs to the
 * filter bar. The product sheet selects in espresso, because a size you have
 * chosen to order is not a filter. The label itself is never ember — ember is
 * light, so it only ever appears as the 1px underline.
 */

type Common = {
  inStock: number[];
  label: string;
  tone?: "espresso" | "filter";
  className?: string;
};

type Props = Common &
  (
    | { multiple?: false; selected: number | null; onSelect: (size: number | null) => void }
    | { multiple: true; selected: number[]; onSelect: (sizes: number[]) => void }
  );

export function SizeRun({ inStock, label, tone = "espresso", className, ...mode }: Props) {
  const stocked = new Set(inStock);
  const chosen = new Set(mode.multiple ? mode.selected : mode.selected === null ? [] : [mode.selected]);

  function toggle(size: number) {
    if (mode.multiple) {
      mode.onSelect(chosen.has(size) ? mode.selected.filter((s) => s !== size) : [...mode.selected, size]);
    } else {
      mode.onSelect(mode.selected === size ? null : size);
    }
  }

  return (
    <div role="group" aria-label={label} className={cx("flex flex-wrap items-center gap-x-1", className)}>
      {SIZE_RUN.map((size) => {
        const available = stocked.has(size);
        const isSelected = chosen.has(size);

        return (
          <button
            key={size}
            type="button"
            disabled={!available}
            aria-pressed={available ? isSelected : undefined}
            onClick={() => toggle(size)}
            className={cx(
              "font-mono text-utility relative flex h-11 min-w-11 items-center justify-center px-1 transition-colors",
              !available && "cursor-not-allowed opacity-30",
              available && !isSelected && "text-muted hover:text-espresso",
              isSelected && "text-espresso",
            )}
          >
            {size}
            {!available && <span className="sr-only"> sold out</span>}
            {/* The same 1px underline the category labels use. */}
            <span
              aria-hidden="true"
              className={cx(
                "absolute inset-x-1 bottom-2 h-px transition-opacity",
                isSelected ? "opacity-100" : "opacity-0",
                tone === "filter" ? "filter-underline" : "bg-espresso",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
