"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Rise } from "@/components/rise";
import { cx } from "@/lib/cx";

/**
 * The shop header's category index, with a photograph that answers the
 * pointer: rest on "loafers" and a loafer appears; move to "sandals" and the
 * preview swaps. The list stops being a menu and starts being a shelf you are
 * looking along.
 *
 * All five previews are stacked and toggled by opacity, so a swap is a
 * crossfade the compositor handles — nothing mounts, nothing lays out, and
 * the photographs are all loaded once. The active one eases from a slight
 * scale so the change reads as the new pair stepping forward rather than a
 * slide changing.
 *
 * Hover is a preview, not the action — the row itself is still the link, and
 * on touch (no hover) the preview simply shows the default and the rows work
 * as plain links. Nothing here is load-bearing, which is what lets it be
 * desktop-only garnish.
 */

export type IndexEntry = {
  href: string;
  label: string;
  count: number;
  image: string;
  alt: string;
  caption: string;
};

export function ShopIndex({ entries }: { entries: IndexEntry[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_16rem] xl:grid-cols-[1fr_18rem]">
      <nav aria-label="Shop by category" onPointerLeave={() => setActive(0)}>
        {entries.map(({ href, label, count }, i) => (
          <Rise key={label} index={i} distance={14}>
            <Link
              href={href}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group border-muted/25 flex items-baseline justify-between gap-6 border-b py-4 md:py-5"
            >
              <span
                className={cx(
                  "type-heading text-[clamp(1.25rem,2vw,1.75rem)] lowercase transition-all duration-300 ease-(--ease-settle) group-hover:translate-x-1.5",
                  active === i ? "text-espresso" : "text-espresso/70",
                )}
              >
                {label}
              </span>
              <span className="font-mono text-utility text-muted flex shrink-0 items-center gap-3 tabular-nums">
                {String(count).padStart(2, "0")}
                <span
                  aria-hidden="true"
                  className="inline-block opacity-0 transition-all duration-300 ease-(--ease-settle) group-hover:translate-x-1 group-hover:opacity-100"
                >
                  →
                </span>
              </span>
            </Link>
          </Rise>
        ))}
      </nav>

      {/* The preview. aria-hidden throughout: it repeats what the rows already
          say, so a screen reader should hear it once, not twice. */}
      <div aria-hidden="true" className="hidden lg:block">
        <div className="plate-media relative aspect-3/4 overflow-hidden">
          {entries.map(({ image, alt, label }, i) => (
            <Image
              key={label}
              src={image}
              alt={alt}
              fill
              sizes="18rem"
              className={cx(
                "object-cover transition-all duration-500 ease-(--ease-settle)",
                active === i ? "scale-100 opacity-100" : "scale-105 opacity-0",
              )}
            />
          ))}
        </div>
        <p className="font-mono text-utility text-muted mt-3 truncate uppercase">
          {entries[active].caption}
        </p>
      </div>
    </div>
  );
}
