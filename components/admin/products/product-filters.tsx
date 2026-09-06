"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Shelf } from "@/lib/catalogue";

/**
 * Search, filters and sort for the product table.
 *
 * ── Why the URL is the state ─────────────────────────────────────────────
 * Every control writes to the query string and the server re-renders from it.
 * That means a filtered view can be bookmarked, sent to somebody, and
 * survives a refresh — and the dashboard's "3 drafts" tile can link straight
 * to `?status=draft` without this component knowing anything about it.
 * Holding the filters in React state instead would make all three impossible.
 *
 * ── Search is debounced, the rest are not ────────────────────────────────
 * A dropdown produces one deliberate change; a search box produces one per
 * keystroke, and each is a round trip. 300ms is long enough to swallow typing
 * and short enough that it does not feel like waiting.
 */

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "shelf", label: "Shelf order" },
  { value: "name", label: "Name" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function ProductFilters({
  total,
  shelves,
}: {
  total: number;
  /* Sent from the server. Shelves are rows the admin can add and delete, so
     there is no constant to map over any more. */
  shelves: Shelf[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const firstRender = useRef(true);

  const apply = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }

    /* Any filter change resets to page one. Without this, narrowing a filter
       while on page 3 lands the editor on an empty page and reads as "no
       results" when there are plenty. */
    next.delete("page");

    router.replace(`${pathname}?${next.toString()}`);
  };

  useEffect(() => {
    /* Skip the first pass, or mounting with `?search=oxford` in the URL would
       immediately re-navigate to the same URL. */
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const id = setTimeout(() => apply({ search: search.trim() || null }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeCount = ["search", "category", "status", "featured", "isNew"].filter((k) =>
    params.get(k),
  ).length;

  return (
    <div className="border-line mb-6 border-b pb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="product-search" className="a-label mb-2 block">
            Search
          </label>
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, slug or SKU"
            className="a-input"
          />
        </div>

        <Select
          label="Shelf"
          value={params.get("category") ?? ""}
          onChange={(v) => apply({ category: v })}
          options={[
            { value: "", label: "All shelves" },
            ...shelves.map((shelf) => ({ value: shelf.slug, label: shelf.name })),
          ]}
        />

        <Select
          label="Status"
          value={params.get("status") ?? ""}
          onChange={(v) => apply({ status: v })}
          options={STATUSES}
        />

        <Select
          label="Sort"
          value={params.get("sort") ?? "updated"}
          onChange={(v) => apply({ sort: v === "updated" ? null : v })}
          options={SORTS}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Toggle
          label="Featured"
          active={params.get("featured") === "1"}
          onClick={() => apply({ featured: params.get("featured") === "1" ? null : "1" })}
        />
        <Toggle
          label="New in"
          active={params.get("isNew") === "1"}
          onClick={() => apply({ isNew: params.get("isNew") === "1" ? null : "1" })}
        />

        <span className="text-grey ml-auto text-[12px] tabular-nums">
          {total} {total === 1 ? "product" : "products"}
        </span>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              router.replace(pathname);
            }}
            className="a-btn"
            data-variant="quiet"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="a-label mb-2 block">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="a-select">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A pressed state, announced — `aria-pressed`, not colour alone. */
function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="a-btn"
      data-variant={active ? "primary" : "secondary"}
    >
      {label}
    </button>
  );
}
