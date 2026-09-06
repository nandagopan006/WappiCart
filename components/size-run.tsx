"use client";

import { SIZE_RUN } from "@/lib/catalogue";
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
 * A selected size is a filled ink square. It is the one control on the site
 * that inverts rather than underlines, because on the product sheet it is the
 * decision that unlocks the order button and it has to be unmissable.
 */

type Props = {
  inStock: number[];
  label: string;
  className?: string;
} & (
  | { multiple?: false; selected: number | null; onSelect: (size: number | null) => void }
  | { multiple: true; selected: number[]; onSelect: (sizes: number[]) => void }
);

export function SizeRun({ inStock, label, className, ...mode }: Props) {
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
    <div role="group" aria-label={label} className={cx("flex flex-wrap items-center gap-2", className)}>
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
              "text-caption border-line flex h-11 min-w-11 items-center justify-center border px-2 transition-colors",
              !available && "cursor-not-allowed opacity-30",
              available && !isSelected && "text-grey hover:border-ink hover:text-ink",
              isSelected && "border-ink bg-ink text-paper",
            )}
          >
            {size}
            {!available && <span className="sr-only"> sold out</span>}
          </button>
        );
      })}
    </div>
  );
}
