import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

/**
 * The flat pieces: cards, tables, badges, empty states, pagination.
 *
 * Grouped in one file because they are all presentational shells with no
 * state between them, and eight files of nine lines each is harder to keep
 * consistent than one file you can read top to bottom.
 */

/* ── Card ───────────────────────────────────────────────────────────────── */

export function AdminCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("a-card", className)}>
      {title ? (
        <header className="a-card-head">
          <div>
            <h2 className="text-ink text-[13px] tracking-[0.08em] uppercase">{title}</h2>
            {description ? <p className="text-grey mt-1 text-[12px]">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cx("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── Status badge ───────────────────────────────────────────────────────── */

export type BadgeTone = "published" | "draft" | "archived" | "attention";

/**
 * Always renders its word.
 *
 * Status is never carried by colour alone — the label is the status, the dot
 * and the border style only reinforce it. That is what keeps the table
 * readable in greyscale and to a colour-blind reader.
 */
export function AdminBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className="a-badge" data-tone={tone}>
      {children}
    </span>
  );
}

/* ── Table ──────────────────────────────────────────────────────────────── */

/**
 * A table that scrolls sideways rather than squashing.
 *
 * The wrapper owns the overflow, so a wide row never makes the whole page
 * scroll horizontally — the same rule the storefront applies to anything
 * that outgrows its column.
 */
export function AdminTable({
  headers,
  children,
  className,
}: {
  headers: ReadonlyArray<{
    label: string;
    className?: string;
    /**
     * A name for a column whose heading is blank on screen — the photograph
     * and the row-actions columns. Without it a screen reader announces two
     * unnamed columns and the reader has to guess what they hold.
     */
    srLabel?: string;
  }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="a-table">
        <thead>
          <tr>
            {/* Keyed by position, not by label. Several columns are
                deliberately blank — the thumbnail and the actions — and two
                empty labels are the same key, which React rejects. The list
                is fixed per table and never reorders, so the index is a
                stable identity. */}
            {headers.map((h, index) => (
              <th key={index} className={h.className} scope="col">
                {h.label}
                {!h.label && h.srLabel ? <span className="sr-only">{h.srLabel}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

/**
 * Never a blank screen.
 *
 * Says what is not here and what to do about it — the storefront's rule for
 * an empty shelf, applied to an empty table. "No products found" with no way
 * forward is the thing this exists to prevent.
 */
export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line border border-dashed px-6 py-14 text-center">
      <p className="text-ink text-[13px] tracking-[0.08em] uppercase">{title}</p>
      {description ? (
        <p className="text-grey mx-auto mt-3 max-w-md text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────────────────────── */

/**
 * Page N of M, with the range spelled out.
 *
 * Numbered pages rather than an infinite list: the admin needs to be able to
 * come back to where it was, and "showing 21–40 of 68" is a position a person
 * can hold in their head.
 */
export function AdminPagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-1 py-3"
    >
      <p className="text-grey text-[12px]">
        Showing {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-2">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} rel="prev">
          ← Previous
        </PageLink>
        <span className="text-grey px-2 text-[12px] tabular-nums">
          {page} / {pages}
        </span>
        <PageLink href={buildHref(page + 1)} disabled={page >= pages} rel="next">
          Next →
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  rel,
  children,
}: {
  href: string;
  disabled: boolean;
  rel: string;
  children: ReactNode;
}) {
  /* A disabled page control is a span, not a dead link. An anchor that goes
     nowhere is still focusable and still announced as a link. */
  if (disabled) {
    return <span className="text-grey/50 px-2 text-[11px] tracking-[0.1em] uppercase">{children}</span>;
  }

  return (
    <a
      href={href}
      rel={rel}
      className="text-ink hover:bg-mist px-2 py-1 text-[11px] tracking-[0.1em] uppercase"
    >
      {children}
    </a>
  );
}

/* ── Page header ────────────────────────────────────────────────────────── */

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-line mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div>
        <h1 className="text-ink text-[20px] tracking-[0.01em]">{title}</h1>
        {description ? <p className="text-grey mt-2 max-w-2xl text-[13px]">{description}</p> : null}
      </div>
      {action ? <div className="flex gap-2">{action}</div> : null}
    </header>
  );
}
